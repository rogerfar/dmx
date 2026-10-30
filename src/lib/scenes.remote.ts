import * as v from 'valibot';
import { command, query } from '$app/server';
import { eq } from 'drizzle-orm';
import { db, sceneValues, scenes } from '#lib/server/db/index.ts';

const Value = v.object({
	fixtureId: v.number(),
	channel: v.pipe(v.number(), v.integer(), v.minValue(0)),
	value: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))
});
type Value = v.InferOutput<typeof Value>;

const SceneInput = v.object({
	id: v.optional(v.number()),
	name: v.pipe(v.string(), v.trim(), v.minLength(1)),
	slot: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(8))),
	values: v.array(Value)
});

export const getScenes = query(async () => {
	const all = db.select().from(scenes).orderBy(scenes.name).all();
	const values = db.select().from(sceneValues).all();
	return all.map((s) => ({ ...s, values: values.filter((x) => x.sceneId === s.id) }));
});

export const saveScene = command(SceneInput, async (input) => {
	const id = db.transaction((tx) => {
		if (input.slot !== null) {
			tx.update(scenes).set({ slot: null }).where(eq(scenes.slot, input.slot)).run();
		}
		let sceneId = input.id;
		if (sceneId === undefined) {
			sceneId = tx
				.insert(scenes)
				.values({ name: input.name, slot: input.slot })
				.returning({ id: scenes.id })
				.get().id;
		} else {
			tx.update(scenes).set({ name: input.name, slot: input.slot }).where(eq(scenes.id, sceneId)).run();
			tx.delete(sceneValues).where(eq(sceneValues.sceneId, sceneId)).run();
		}
		if (input.values.length) {
			tx.insert(sceneValues)
				.values(input.values.map((x) => ({ ...x, sceneId })))
				.onConflictDoNothing()
				.run();
		}
		return sceneId;
	});
	await getScenes().refresh();
	return id;
});

export const deleteScene = command(v.number(), async (id) => {
	db.delete(scenes).where(eq(scenes.id, id)).run();
	await getScenes().refresh();
});
