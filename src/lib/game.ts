import { supabase } from './supabase';
import type { AwardResult, DailyCard, GameState, XpKind } from './types';

/** Keep thresholds in sync with public.level_for() in the visual_game migration. */
export const LEVELS = [
  { name: 'Dreamer', min: 0, emoji: '🌙' },
  { name: 'Explorer', min: 100, emoji: '🧭' },
  { name: 'Pathfinder', min: 300, emoji: '🗺️' },
  { name: 'Navigator', min: 700, emoji: '⛵' },
  { name: 'Builder', min: 1500, emoji: '🏗️' },
  { name: 'Visionary', min: 3000, emoji: '🌟' },
];

export function levelInfo(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { index: i, ...cur, next, progress, toNext: next ? next.min - xp : 0 };
}

export const BADGES: Record<string, { emoji: string; name: string; how: string }> = {
  first_whatif: { emoji: '🔮', name: 'First What-If', how: 'Answer your first daily card' },
  first_plan: { emoji: '🗺️', name: 'Plan Maker', how: 'Build your first plan' },
  first_milestone: { emoji: '🏁', name: 'Milestone!', how: 'Finish a milestone task' },
  first_story: { emoji: '📖', name: 'Storyteller', how: 'Meet your future self' },
  first_share: { emoji: '📣', name: 'Sharer', how: 'Share your parallel lives' },
  streak_3: { emoji: '🔥', name: 'On Fire', how: 'Reach a 3-day streak' },
  streak_7: { emoji: '⚡', name: 'Week Warrior', how: 'Reach a 7-day streak' },
  streak_30: { emoji: '🏆', name: 'Unstoppable', how: 'Reach a 30-day streak' },
  explorer_5: { emoji: '🌌', name: 'Multiverse', how: 'Explore 5 different lives' },
  level_pathfinder: { emoji: '🗺️', name: 'Pathfinder', how: 'Reach 300 XP' },
  level_builder: { emoji: '🏗️', name: 'Builder', how: 'Reach 1,500 XP' },
};

/** Local calendar day as YYYY-MM-DD (the device's timezone). */
export function localDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Streak as the user should see it right now (it only "breaks" once a day is missed). */
export function visibleStreak(g: GameState | null) {
  if (!g || !g.last_active_day) return { streak: 0, doneToday: false, atRisk: false };
  const today = localDay();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = localDay(y);
  const d2 = new Date();
  d2.setDate(d2.getDate() - 2);
  if (g.last_active_day === today) return { streak: g.streak, doneToday: true, atRisk: false };
  if (g.last_active_day === yesterday) return { streak: g.streak, doneToday: false, atRisk: true };
  if (g.last_active_day === localDay(d2) && g.freezes > 0) return { streak: g.streak, doneToday: false, atRisk: true };
  return { streak: 0, doneToday: false, atRisk: false };
}

export async function getGameState(): Promise<GameState | null> {
  const { data, error } = await supabase.from('game_state').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getTodayXp() {
  const { data, error } = await supabase.from('xp_events').select('amount').eq('day', localDay());
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, r) => s + r.amount, 0);
}

export async function getBadges(): Promise<string[]> {
  const { data, error } = await supabase.from('badges').select('badge_id');
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => b.badge_id);
}

export async function awardXp(kind: XpKind, ref: string): Promise<AwardResult> {
  const { data, error } = await supabase.rpc('award_xp', { p_kind: kind, p_ref: ref });
  if (error) throw new Error(error.message);
  return data as AwardResult;
}

export async function answerDailyCard(cardId: string, choice: 'a' | 'b'): Promise<AwardResult> {
  const { data, error } = await supabase.rpc('answer_daily_card', { p_card: cardId, p_choice: choice });
  if (error) throw new Error(error.message);
  return data as AwardResult;
}

export async function fetchDailyCard(): Promise<DailyCard> {
  const { data, error } = await supabase.functions.invoke('daily-card', { body: {}, timeout: 60_000 });
  if (error) throw new Error("Couldn't load today's card. Pull to try again.");
  return data as DailyCard;
}

export async function setGamePrefs(reminderTime: string | null, timezone?: string) {
  const { error } = await supabase.rpc('set_game_prefs', {
    p_reminder_time: reminderTime ?? '',
    p_timezone: timezone ?? '',
  });
  if (error) throw new Error(error.message);
}
