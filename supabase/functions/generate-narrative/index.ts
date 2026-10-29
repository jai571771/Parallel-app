// "Meet your future self": a short day-in-the-life story for one scenario.
import { describeProfile, generateJson } from '../_shared/gemini.ts';
import { adminClient, HttpError, json, requireUser, serve } from '../_shared/http.ts';
import { assertMonthlyAllowance, limitReached, limitsFor, recordGeneration } from '../_shared/limits.ts';

serve(async (req, body) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const scenarioId = String(body.scenarioId ?? '');

  const { data: scenario } = await admin
    .from('scenarios')
    .select('*, snapshots(horizon_years)')
    .eq('id', scenarioId)
    .eq('user_id', user.id)
    .single();
  if (!scenario) throw new HttpError(404, 'Scenario not found.');
  if (scenario.narrative) return json({ narrative: scenario.narrative });

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
  const limits = limitsFor(profile?.plan);

  const { count } = await admin
    .from('scenarios')
    .select('id', { count: 'exact', head: true })
    .eq('snapshot_id', scenario.snapshot_id)
    .not('narrative', 'is', null);
  if ((count ?? 0) >= limits.narrativesPerSnapshot) {
    limitReached('Future-self stories for every path are part of PARALLEL Plus.', 'narratives');
  }
  await assertMonthlyAllowance(admin, user.id, profile?.plan ?? 'free');

  const years = scenario.snapshots?.horizon_years ?? 5;
  const isPlus = profile?.plan === 'plus';
  const prompt = `${describeProfile(profile ?? {})}

Scenario "${scenario.title}" — ${scenario.tagline}
Premise: ${scenario.premise}
Possible scenario: ${scenario.summary}
Main trade-off: ${scenario.tradeoff}

Write "narrative": a vivid, grounded second-person story of one ordinary day about ${years} years from now, if this path played out roughly as described.
- ${isPlus ? '220–320 words, in 3–4 short paragraphs' : '120–170 words, in 2 short paragraphs'}.
- Cover the morning, the work or study, the environment, a small moment of satisfaction AND a small honest cost of this path.
- Keep it believable and specific to the profile. No fame, wealth or numbers. Never claim this will happen.
- End with one reflective line the user can take back to today.`;

  const out = await generateJson<{ narrative: string }>({
    prompt,
    schema: { type: 'OBJECT', properties: { narrative: { type: 'STRING' } }, required: ['narrative'] },
    temperature: 0.95,
  });
  const narrative = String(out.narrative ?? '').trim().slice(0, 4000);
  if (!narrative) throw new HttpError(502, "We couldn't write your story this time. Please try again.");

  await admin.from('scenarios').update({ narrative }).eq('id', scenario.id).eq('user_id', user.id);
  await recordGeneration(admin, user.id);
  return json({ narrative });
});
