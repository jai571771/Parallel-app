// "Build this future": turns a scenario into practical weekly steps and milestones.
import { describeProfile, generateJson } from '../_shared/gemini.ts';
import { adminClient, HttpError, json, requireUser, serve } from '../_shared/http.ts';
import { assertMonthlyAllowance, limitReached, limitsFor, recordGeneration } from '../_shared/limits.ts';

type GeneratedPlan = {
  title: string;
  summary: string;
  review_in_weeks: number;
  tasks: { title: string; detail: string; week: number; is_milestone: boolean }[];
};

serve(async (req, body) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const scenarioId = String(body.scenarioId ?? '');

  const { data: scenario } = await admin
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .eq('user_id', user.id)
    .single();
  if (!scenario) throw new HttpError(404, 'Scenario not found.');

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
  const plan = profile?.plan ?? 'free';
  const limits = limitsFor(plan);

  const { count } = await admin.from('plans').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) >= limits.activePlans) {
    limitReached(
      plan === 'plus'
        ? `You have ${limits.activePlans} active plans. Delete one to create another.`
        : 'Running several action plans is part of PARALLEL Plus. Delete your current plan to start a new one.',
      'plans',
    );
  }
  await assertMonthlyAllowance(admin, user.id, plan);

  const isPlus = plan === 'plus';
  const prompt = `${describeProfile(profile ?? {})}

The user wants to move toward this path:
"${scenario.title}" — ${scenario.tagline}
Premise: ${scenario.premise}
What it requires: ${(scenario.requirements ?? []).join('; ')}

Create a realistic starter action plan.
- "title": short, motivating (max 8 words).
- "summary": 1–2 sentences on the focus of the next few weeks.
- "tasks": ${isPlus ? '8–12 tasks spread over weeks 1–6, including 2–3 milestones' : '4–6 tasks over weeks 1–2, including 1 milestone'}. Each task is small, specific and doable within the user's available time (${profile?.hours_available ?? 'a little'} hours/day). "detail" is one helpful sentence. "is_milestone" marks a meaningful checkpoint.
- "review_in_weeks": when they should review progress (${isPlus ? '2–6' : '2'}).
Do not promise outcomes.`;

  const out = await generateJson<GeneratedPlan>({
    prompt,
    temperature: 0.6,
    schema: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        summary: { type: 'STRING' },
        review_in_weeks: { type: 'INTEGER' },
        tasks: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              detail: { type: 'STRING' },
              week: { type: 'INTEGER' },
              is_milestone: { type: 'BOOLEAN' },
            },
            required: ['title', 'detail', 'week', 'is_milestone'],
          },
        },
      },
      required: ['title', 'summary', 'review_in_weeks', 'tasks'],
    },
  });

  const weeks = Math.min(Math.max(Number(out.review_in_weeks) || 2, 1), 12);
  const review = new Date(Date.now() + weeks * 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: created, error } = await admin
    .from('plans')
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      title: String(out.title ?? `Toward ${scenario.title}`).slice(0, 80),
      summary: String(out.summary ?? '').slice(0, 500) || null,
      review_date: review,
    })
    .select('id')
    .single();
  if (error || !created) throw error ?? new Error('plan insert failed');

  const tasks = (Array.isArray(out.tasks) ? out.tasks : []).slice(0, isPlus ? 14 : 7).map((t) => ({
    plan_id: created.id,
    user_id: user.id,
    title: String(t.title ?? '').slice(0, 160),
    detail: String(t.detail ?? '').slice(0, 300) || null,
    week: Math.min(Math.max(Number(t.week) || 1, 1), 12),
    is_milestone: Boolean(t.is_milestone),
  })).filter((t) => t.title);

  if (tasks.length) {
    const { error: tErr } = await admin.from('plan_tasks').insert(tasks);
    if (tErr) {
      await admin.from('plans').delete().eq('id', created.id);
      throw tErr;
    }
  }

  await recordGeneration(admin, user.id);
  return json({ planId: created.id });
});
