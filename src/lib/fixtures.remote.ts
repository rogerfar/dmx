import * as v from 'valibot';
import { command, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, fixtures } from '#lib/server/db/index.ts';

const Fixture = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1)),
	address: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(512)),
	channelCount: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(512)),
	channelLabels: v.array(v.string())
});

function normalize(f: v.InferOutput<typeof Fixture>) {
	if (f.address + f.channelCount - 1 > 512) error(400, 'Fixture exceeds DMX universe (512)');
	const channelLabels = Array.from({ length: f.channelCount }, (_, i) => f.channelLabels[i]?.trim() ?? '');
	return { ...f, channelLabels };
}

export const getFixtures = query(async () => {
	return db.select().from(fixtures).orderBy(fixtures.address).all();
});

export const addFixture = command(Fixture, async (input) => {
	db.insert(fixtures).values(normalize(input)).run();
	await getFixtures().refresh();
});

export const updateFixture = command(
	v.object({ id: v.number(), fixture: Fixture }),
	async ({ id, fixture }) => {
		db.update(fixtures).set(normalize(fixture)).where(eq(fixtures.id, id)).run();
		await getFixtures().refresh();
	}
);

export const deleteFixture = command(v.number(), async (id) => {
	db.delete(fixtures).where(eq(fixtures.id, id)).run();
	await getFixtures().refresh();
});
