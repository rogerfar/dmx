const KEY = 'dmx-settings';
const clamp = (n: number) => Math.min(8, Math.max(1, Math.round(Number(n)) || 1));

class Settings {
	columns = $state(3);
	rows = $state(3);

	constructor() {
		if (typeof localStorage === 'undefined') return;
		try {
			const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			if (saved.columns) this.columns = clamp(saved.columns);
			if (saved.rows) this.rows = clamp(saved.rows);
		} catch {
			// ignore corrupt settings
		}
	}

	get slotCount() {
		return this.columns * this.rows;
	}

	setGrid(columns: number, rows: number) {
		this.columns = clamp(columns);
		this.rows = clamp(rows);
		localStorage.setItem(KEY, JSON.stringify({ columns: this.columns, rows: this.rows }));
	}
}

export const settings = new Settings();
