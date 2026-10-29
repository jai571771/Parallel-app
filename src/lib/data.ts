import { currentPeriod } from './limits';
import { supabase } from './supabase';
import type { ActionPlan, Checkin, PlanTask, Profile, Scenario, Snapshot, Usage } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const byPosition = (a: Scenario, b: Scenario) => a.position - b.position;

export async function getProfile(userId: string) {
  return check<Profile>(await supabase.from('profiles').select('*').eq('id', userId).single());
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  return check<Profile>(
    await supabase.from('profiles').update(patch).eq('id', userId).select('*').single(),
  );
}

export async function listSnapshots() {
  const rows = check<Snapshot[]>(
    await supabase
      .from('snapshots')
      .select('*, scenarios(*)')
      .order('created_at', { ascending: false }),
  );
  rows.forEach((s) => s.scenarios?.sort(byPosition));
  return rows;
}

export async function getSnapshot(id: string) {
  const s = check<Snapshot>(
    await supabase.from('snapshots').select('*, scenarios(*)').eq('id', id).single(),
  );
  s.scenarios?.sort(byPosition);
  return s;
}

export async function deleteSnapshot(id: string) {
  check(await supabase.from('snapshots').delete().eq('id', id));
}

export async function getScenario(id: string) {
  return check<Scenario>(await supabase.from('scenarios').select('*').eq('id', id).single());
}

export async function listPlans() {
  const plans = check<ActionPlan[]>(
    await supabase
      .from('plans')
      .select('*, plan_tasks(*), scenarios(id, title, snapshot_id)')
      .order('created_at', { ascending: false }),
  );
  plans.forEach((p) =>
    p.plan_tasks?.sort((a, b) => a.week - b.week || a.created_at.localeCompare(b.created_at)),
  );
  return plans;
}

export async function deletePlan(id: string) {
  check(await supabase.from('plans').delete().eq('id', id));
}

export async function setTaskDone(task: PlanTask, done: boolean) {
  check(
    await supabase
      .from('plan_tasks')
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq('id', task.id),
  );
}

export async function addTask(userId: string, planId: string, title: string, week: number) {
  check(await supabase.from('plan_tasks').insert({ user_id: userId, plan_id: planId, title, week }));
}

export async function listCheckins(limit = 10) {
  return check<Checkin[]>(
    await supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(limit),
  );
}

export async function addCheckin(userId: string, note: string, planId: string | null) {
  check(await supabase.from('checkins').insert({ user_id: userId, note, plan_id: planId }));
}

export async function getUsage(): Promise<Usage> {
  const period = currentPeriod();
  const res = await supabase.from('usage').select('period, generations').eq('period', period).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data ?? { period, generations: 0 };
}

/** Everything the user has stored, for the "export my data" privacy control. */
export async function exportAllData(userId: string) {
  const [profile, snapshots, plans, checkins] = await Promise.all([
    getProfile(userId),
    listSnapshots(),
    listPlans(),
    listCheckins(1000),
  ]);
  return { exported_at: new Date().toISOString(), profile, snapshots, plans, checkins };
}

/** Deletes scenarios, plans and check-ins and resets the profile (account itself stays). */
export async function deleteAllData(userId: string) {
  check(await supabase.from('checkins').delete().eq('user_id', userId));
  check(await supabase.from('plans').delete().eq('user_id', userId));
  check(await supabase.from('snapshots').delete().eq('user_id', userId));
  check(
    await supabase
      .from('profiles')
      .update({
        age_range: null,
        stage: null,
        interests: [],
        ambition: null,
        habits: null,
        strengths: null,
        challenges: null,
        change_goal: null,
        hours_available: null,
        onboarded: false,
      })
      .eq('id', userId),
  );
}
