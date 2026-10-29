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

Write "narrative": a short, friendly story about one normal day, ${years} years from now, if this life happened.
- Write it like a simple story for a friend. Use "you". Short sentences. Everyday words.
- ${isPlus ? '180–240 words, in 3–4 short paragraphs' : 'About 120 words, in 2–3 short paragraphs'}.
- Show the morning, what you do during the day, where you are, one happy moment AND one small hard thing about this life.
- Keep it real and personal to the profile. No fame, riches or numbers. Never say it will definitely happen.
- End with one short line they can think about today.`;

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
