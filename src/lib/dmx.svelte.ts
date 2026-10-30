export type DeviceInfo = {
	name: string;
	vendorId: number;
	productId: number;
	manufacturer: string;
	serial: string;
	interfaces: string[];
};

const log = (...args: unknown[]) => console.log('[dmx]', ...args);
const hex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');

export const PROTOCOLS = {
	'soundswitch-micro': 'SoundSwitch Micro (sTRt framing, captured from SoundSwitch)',
	'enttec-pro': 'Enttec DMX USB Pro framing (7E 06 len 00 data E7)',
	'raw-513': 'Raw: start code 00 + 512 slots',
	'raw-512': 'Raw: 512 slots only',
	'ftdi-open-dmx': 'FTDI Open DMX (control transfers + break)'
} as const;
export type Protocol = keyof typeof PROTOCOLS;

// Messages: 'sTRt' magic, u16 LE command, u16 LE payload length, payload.
function ssMessage(cmd: number, payload: ArrayLike<number>): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(8 + payload.length);
	out.set([0x73, 0x54, 0x52, 0x74, cmd & 0xff, cmd >> 8, payload.length & 0xff, payload.length >> 8]);
	out.set(payload, 8);
	return out;
}

class DmxOutput {
	status = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	error = $state('');
	info = $state<DeviceInfo | null>(null);
	supported = typeof navigator !== 'undefined' && 'usb' in navigator;

	protocol = $state<Protocol>('soundswitch-micro');

	/** Delay between frames, in ms. Adjustable at runtime: `dmx.frameIntervalMs = 50`. */
	frameIntervalMs = 25;

	#device: USBDevice | null = null;
	#endpoint = 2;
	#universe: Uint8Array<ArrayBuffer> = new Uint8Array(512);
	#running = false;

	constructor() {
		if (this.supported) {
			navigator.usb.addEventListener('disconnect', (e) => {
				log('USB disconnect event', e.device.productName);
				if (e.device === this.#device) this.disconnect();
			});
		}
	}

	/** Replace the whole universe; the frame loop picks it up on the next tick. */
	set(universe: Uint8Array<ArrayBuffer>) {
		const used = universe.reduce((n, v) => n + (v ? 1 : 0), 0);
		log(`universe set: ${used} non-zero channel(s)`, this.#nonZero(universe));
		this.#universe = universe;
	}

	blackout() {
		log('blackout');
		this.#universe = new Uint8Array(512);
	}

	#nonZero(universe: Uint8Array) {
		const out: Record<number, number> = {};
		universe.forEach((v, i) => {
			if (v) out[i + 1] = v;
		});
		return out;
	}

	/** Re-open a device the user already granted access to (no prompt). */
	async autoConnect() {
		if (!this.supported || this.#device) return;
		const devices = await navigator.usb.getDevices();
		log('previously granted devices:', devices.map((d) => d.productName));
		if (devices[0]) await this.#open(devices[0]);
	}

	/** Must be called from a user gesture. */
	async connect() {
		this.error = '';
		try {
			log('requesting device');
			const device = await navigator.usb.requestDevice({ filters: [] });
			await this.#open(device);
		} catch (e) {
			if ((e as Error).name === 'NotFoundError') log('device picker cancelled');
			else {
				console.error('[dmx] connect failed', e);
				this.error = (e as Error).message;
			}
		}
	}

	async disconnect() {
		log('disconnecting');
		this.#running = false;
		const device = this.#device;
		this.#device = null;
		this.status = 'disconnected';
		this.info = null;
		try {
			await device?.close();
		} catch (e) {
			console.warn('[dmx] close failed', e);
		}
	}

	async #open(device: USBDevice) {
		this.status = 'connecting';
		log('opening', {
			product: device.productName,
			vendorId: device.vendorId.toString(16),
			productId: device.productId.toString(16),
			serial: device.serialNumber
		});
		try {
			await device.open();
			log('opened; configuration:', device.configuration?.configurationValue ?? 'none');
			if (!device.configuration) {
				await device.selectConfiguration(1);
				log('selected configuration 1');
			}
			await device.claimInterface(0);
			log('claimed interface 0');

			const alt = device.configuration!.interfaces[0].alternate;
			const out = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
			if (!out) throw new Error('No bulk OUT endpoint found on interface 0');
			this.#endpoint = out.endpointNumber;
			log('using bulk OUT endpoint', out.endpointNumber, 'packetSize', out.packetSize);

			this.info = {
				name: device.productName ?? 'Unknown device',
				vendorId: device.vendorId,
				productId: device.productId,
				manufacturer: device.manufacturerName ?? '',
				serial: device.serialNumber ?? '',
				interfaces: device.configuration!.interfaces.flatMap((i) =>
					i.alternate.endpoints.map(
						(e) => `if${i.interfaceNumber} ep${e.endpointNumber} ${e.direction} ${e.type}`
					)
				)
			};
			log('device info', $state.snapshot(this.info));

			this.#device = device;
			this.status = 'connected';
			this.#run(device);
		} catch (e) {
			console.error('[dmx] open failed', e);
			this.error = (e as Error).message;
			this.status = 'disconnected';
			try {
				await device.close();
			} catch {}
		}
	}

	// FT232R-style Open DMX init: 250 kbaud, 8 data bits, no parity, 2 stop bits.
	// NOTE: only meaningful for FTDI chips; other devices will ignore or reject these.
	async #initFtdi(device: USBDevice) {
		const ctl = async (name: string, request: number, value: number, index = 0) => {
			const result = await device.controlTransferOut({
				requestType: 'vendor',
				recipient: 'device',
				request,
				value,
				index
			});
			log(`control ${name} (req ${request}, val ${value}) ->`, result.status);
		};
		await ctl('reset', 0x00, 0);
		await ctl('baud', 0x03, 12, 0);
		await ctl('8N2', 0x04, 8 | (2 << 11));
		await ctl('flow', 0x02, 0);
	}

	// Setup messages observed from SoundSwitch before its first DMX frame.
	async #initSoundSwitch(device: USBDevice) {
		for (const payload of [[0, 0, 1, 0], [1, 0, 0xff, 0xff]]) {
			const msg = ssMessage(2, payload);
			const r = await device.transferOut(this.#endpoint, msg);
			log('soundswitch init', hex(msg), '->', r.status);
		}
	}

	#buildFrame(): Uint8Array<ArrayBuffer> {
		switch (this.protocol) {
			case 'soundswitch-micro':
				return ssMessage(1, [0, 0, ...this.#universe]);
			case 'enttec-pro': {
				const frame = new Uint8Array(518);
				frame[0] = 0x7e; // start of message
				frame[1] = 6; // label: output only send DMX packet
				frame[2] = 513 & 0xff;
				frame[3] = 513 >> 8;
				frame[4] = 0; // DMX start code
				frame.set(this.#universe, 5);
				frame[517] = 0xe7; // end of message
				return frame;
			}
			case 'raw-512':
				return new Uint8Array(this.#universe);
			default: {
				const frame = new Uint8Array(513);
				frame.set(this.#universe, 1);
				return frame;
			}
		}
	}

	async #run(device: USBDevice) {
		this.#running = true;
		let initialisedFor: Protocol | null = null;
		const setBreak = (on: boolean) =>
			device.controlTransferOut({
				requestType: 'vendor',
				recipient: 'device',
				request: 0x04,
				value: 8 | (2 << 11) | (on ? 1 << 14 : 0),
				index: 0
			});
		let count = 0;
		log('frame loop started, protocol', this.protocol, 'interval', this.frameIntervalMs, 'ms');
		try {
			while (this.#running && this.#device === device) {
				const protocol = this.protocol;
				if (protocol !== initialisedFor) {
					log('using protocol', protocol);
					if (protocol === 'ftdi-open-dmx') await this.#initFtdi(device);
					if (protocol === 'soundswitch-micro') await this.#initSoundSwitch(device);
					initialisedFor = protocol;
					count = 0;
				}
				const ftdi = protocol === 'ftdi-open-dmx';
				const breakOn = ftdi ? await setBreak(true) : null;
				const breakOff = ftdi ? await setBreak(false) : null;
				const frame = this.#buildFrame();
				const result = await device.transferOut(this.#endpoint, frame);
				count++;
				// Log the first few frames in detail, then once every ~5 seconds.
				if (count <= 3 || count % Math.round(5000 / (this.frameIntervalMs + 5)) === 0) {
					log(`frame #${count}`, {
						protocol,
						breakOn: breakOn?.status,
						breakOff: breakOff?.status,
						transfer: result.status,
						bytesWritten: result.bytesWritten,
						length: frame.length,
						head: hex(frame.subarray(0, 16))
					});
				}
				await new Promise((r) => setTimeout(r, this.frameIntervalMs));
			}
		} catch (e) {
			console.error(`[dmx] frame loop failed after ${count} frame(s)`, e);
			this.error = (e as Error).message;
			if (this.#device === device) await this.disconnect();
		}
		log('frame loop stopped after', count, 'frames');
	}
}

export const dmx = new DmxOutput();
