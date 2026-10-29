// Creates a life snapshot (baseline + one alternate) or adds an alternate path to an existing snapshot.
import { cleanScenario, describeProfile, generateJson, scenarioSchema, type GeneratedScenario } from '../_shared/gemini.ts';
import { adminClient, HttpError, json, requireUser, serve } from '../_shared/http.ts';
import { assertMonthlyAllowance, limitReached, limitsFor, recordGeneration } from '../_shared/limits.ts';

type Body = {
  horizonYears?: number;
  decision?: string;
  snapshotId?: string;
  labContext?: string;
  replaceOldest?: boolean;
};

serve(async (req, raw) => {
  const body = raw as Body;
  const admin = adminClient();
  const user = await requireUser(req, admin);

  const { data: profile, error: pErr } = await admin.from('profiles').select('*').eq('id', user.id).single();
  if (pErr || !profile) throw new HttpError(400, 'Profile not found. Please complete onboarding first.');
  const limits = limitsFor(profile.plan);

  const horizon = Number(body.horizonYears ?? 5);
  if (!(limits.horizons as readonly number[]).includes(horizon)) {
    limitReached(`The ${horizon}-year view is part of PARALLEL Plus.`, 'horizon');
  }

  const decision = typeof body.decision === 'string' ? body.decision.trim().slice(0, 300) : '';
  const labContext = typeof body.labContext === 'string' ? body.labContext.trim().slice(0, 400) : '';

  await assertMonthlyAllowance(admin, user.id, profile.plan);

  const context = [
    describeProfile(profile),
    `Time horizon: ${horizon} years.`,
    labContext ? `Extra context: ${labContext}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // ── Add another alternate path to an existing snapshot ──
  if (body.snapshotId) {
    const { data: snap } = await admin
      .from('snapshots')
      .select('*, scenarios(title, kind, position, premise)')
      .eq('id', body.snapshotId)
      .eq('user_id', user.id)
      .single();
    if (!snap) throw new HttpError(404, 'Snapshot not found.');

    const scenarios = (snap.scenarios ?? []) as { title: string; kind: string; position: number; premise: string }[];
    const alternates = scenarios.filter((s) => s.kind === 'alternate').length;
    if (alternates >= limits.alternatesPerSnapshot) {
      limitReached('Exploring more parallel paths in one snapshot is part of PARALLEL Plus.', 'alternates');
    }

    const existing = scenarios.map((s) => `- ${s.title}: ${s.premise}`).join('\n');
    const prompt = `${context}

The user already explored these paths in this snapshot:
${existing}

Create ONE new possible life that is clearly different from the lives above.
${decision ? `The decision to explore: <decision>${decision}</decision>` : 'Choose the most meaningful different decision for this person.'}
Use the snapshot horizon of ${snap.horizon_years} years.`;

    const alt = cleanScenario(await generateJson<GeneratedScenario>({ prompt, schema: scenarioSchema }));
    const position = Math.max(0, ...scenarios.map((s) => s.position)) + 1;
    const { error } = await admin
      .from('scenarios')
      .insert({ ...alt, snapshot_id: snap.id, user_id: user.id, kind: 'alternate', position });
    if (error) throw error;

    await recordGeneration(admin, user.id);
    return json({ snapshotId: snap.id });
  }

  // ── New snapshot ──
  const { data: existingSnaps } = await admin
    .from('snapshots')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  const count = existingSnaps?.length ?? 0;
  if (count >= limits.savedSnapshots) {
    if (!body.replaceOldest) {
      limitReached(`Your plan keeps ${limits.savedSnapshots} saved snapshot${limits.savedSnapshots === 1 ? '' : 's'}.`, 'saved_snapshots');
    }
  }

  const prompt = `${context}

Create this person's first PARALLEL life snapshot with two illustrative futures over ${horizon} years:

1. "baseline" — The Familiar Path: they keep living the way they do now. Fair and kind, with real good parts.
2. "alternate" — ${decision ? `the life where they make this choice: <decision>${decision}</decision>` : 'the one change that matters most for this person, based on their ambition and what they want to change.'}

Make the two lives clearly different: different scene if it fits, and meters that show the real differences.

Also write:
- "title": a short question for this snapshot, max 6 simple words, e.g. "Start a business, or finish college first?"
- "insight": exactly 2 short, simple sentences about where they are now, ending with one small idea. Example: "You dream of starting a company, but most of your time goes to classes. Building one small project a week could help."`;

  const schema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      insight: { type: 'STRING' },
      baseline: scenarioSchema,
      alternate: scenarioSchema,
    },
    required: ['title', 'insight', 'baseline', 'alternate'],
  };

  const out = await generateJson<{ title: string; insight: string; baseline: GeneratedScenario; alternate: GeneratedScenario }>({
    prompt,
    schema,
  });

  // Free plan: replace the oldest snapshot(s) only after generation succeeded.
  if (count >= limits.savedSnapshots && body.replaceOldest && existingSnaps) {
    const toDelete = existingSnaps.slice(0, count - limits.savedSnapshots + 1).map((s) => s.id);
    await admin.from('snapshots').delete().in('id', toDelete).eq('user_id', user.id);
  }

  const { data: snap, error: sErr } = await admin
    .from('snapshots')
    .insert({
      user_id: user.id,
      title: String(out.title ?? 'My parallel lives').slice(0, 80),
      insight: String(out.insight ?? '').slice(0, 800) || null,
      horizon_years: horizon,
      inputs: { decision: decision || null, labContext: labContext || null },
    })
    .select('id')
    .single();
  if (sErr || !snap) throw sErr ?? new Error('snapshot insert failed');

  const { error: scErr } = await admin.from('scenarios').insert([
    { ...cleanScenario(out.baseline), snapshot_id: snap.id, user_id: user.id, kind: 'baseline', position: 0 },
    { ...cleanScenario(out.alternate), snapshot_id: snap.id, user_id: user.id, kind: 'alternate', position: 1 },
  ]);
  if (scErr) {
    await admin.from('snapshots').delete().eq('id', snap.id);
    throw scErr;
  }

  await recordGeneration(admin, user.id);
  return json({ snapshotId: snap.id });
});
