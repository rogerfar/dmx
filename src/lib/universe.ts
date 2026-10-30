export type ChannelValue = { fixtureId: number; channel: number; value: number };

export function buildUniverse(
	values: ChannelValue[],
	fixtures: { id: number; address: number }[]
): Uint8Array<ArrayBuffer> {
	const universe = new Uint8Array(512);
	const addresses = new Map(fixtures.map((f) => [f.id, f.address]));
	for (const x of values) {
		const base = addresses.get(x.fixtureId);
		if (base === undefined) continue;
		const index = base + x.channel - 1;
		if (index >= 0 && index < 512) universe[index] = x.value;
	}
	return universe;
}
