import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_PATH ?? 'dmx.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
CREATE TABLE IF NOT EXISTS fixtures (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	address INTEGER NOT NULL,
	channel_count INTEGER NOT NULL,
	channel_labels TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scenes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	slot INTEGER UNIQUE
);
CREATE TABLE IF NOT EXISTS scene_values (
	scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
	fixture_id INTEGER NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
	channel INTEGER NOT NULL,
	value INTEGER NOT NULL,
	PRIMARY KEY (scene_id, fixture_id, channel)
);
`);

export const db = drizzle(sqlite, { schema });
export * from './schema';
