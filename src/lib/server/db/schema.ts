import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const fixtures = sqliteTable('fixtures', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	address: integer('address').notNull(),
	channelCount: integer('channel_count').notNull(),
	channelLabels: text('channel_labels', { mode: 'json' }).$type<string[]>().notNull()
});

export const scenes = sqliteTable('scenes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	slot: integer('slot').unique()
});

export const sceneValues = sqliteTable(
	'scene_values',
	{
		sceneId: integer('scene_id')
			.notNull()
			.references(() => scenes.id, { onDelete: 'cascade' }),
		fixtureId: integer('fixture_id')
			.notNull()
			.references(() => fixtures.id, { onDelete: 'cascade' }),
		channel: integer('channel').notNull(),
		value: integer('value').notNull()
	},
	(t) => [primaryKey({ columns: [t.sceneId, t.fixtureId, t.channel] })]
);
