import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Celebrate, type Celebration, type CelebrationEvent } from '@/components/Celebrate';
import {
  answerDailyCard,
  awardXp,
  fetchDailyCard,
  getBadges,
  getGameState,
  getTodayXp,
  localDay,
  setGamePrefs,
} from '@/lib/game';
import type { AwardResult, DailyCard, GameState, XpKind } from '@/lib/types';
import { useAuth } from './AuthProvider';

type GameCtx = {
  game: GameState | null;
  todayXp: number;
  badges: string[];
  card: DailyCard | null;
  cardLoading: boolean;
  cardError: string | null;
  loadCard: () => Promise<void>;
  answerCard: (choice: 'a' | 'b') => Promise<void>;
  award: (kind: XpKind, ref: string) => Promise<void>;
  refresh: () => Promise<void>;
  setReminder: (time: string | null) => Promise<void>;
};

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [game, setGame] = useState<GameState | null>(null);
  const [todayXp, setTodayXp] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [card, setCard] = useState<DailyCard | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const cardPromise = useRef<Promise<void> | null>(null);
  const nextId = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [g, xp, b] = await Promise.all([getGameState(), getTodayXp(), getBadges()]);
      setGame(g);
      setTodayXp(xp);
      setBadges(b);
    } catch (e) {
      console.warn('game refresh failed', e);
    }
  }, []);

  const loadCard = useCallback(() => {
    // A card belongs to one day; refetch when the date changes.
    if (card && card.day === localDay()) return Promise.resolve();
    if (cardPromise.current) return cardPromise.current;
    setCardLoading(true);
    setCardError(null);
    cardPromise.current = fetchDailyCard()
      .then(setCard)
      .catch((e) => setCardError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setCardLoading(false);
        cardPromise.current = null;
      });
    return cardPromise.current;
  }, [card]);

  const applyResult = useCallback(
    (r: AwardResult) => {
      const events: CelebrationEvent[] = [];
      if (r.gained > 0) events.push({ kind: 'xp', amount: r.gained });
      if (r.streak_extended) events.push({ kind: 'streak', streak: r.streak, freezeUsed: r.freeze_used });
      if (r.gained > 0 && todayXp < r.daily_goal && r.today_xp >= r.daily_goal) events.push({ kind: 'goal' });
      if (r.level_up) events.push({ kind: 'level', level: r.level });
      r.new_badges.forEach((badge) => events.push({ kind: 'badge', badge }));
      if (events.length) setQueue((q) => [...q, ...events.map((e) => ({ ...e, id: ++nextId.current }))]);

      setTodayXp(r.today_xp);
      setBadges((b) => [...new Set([...b, ...r.new_badges])]);
      setGame((g) =>
        g && {
          ...g,
          xp: r.xp,
          streak: r.streak,
          freezes: r.freezes,
          longest_streak: Math.max(g.longest_streak, r.streak),
          last_active_day: r.gained > 0 ? localDay() : g.last_active_day,
        },
      );
    },
    [todayXp],
  );

  const award = useCallback(
    async (kind: XpKind, ref: string) => {
      try {
        applyResult(await awardXp(kind, ref));
      } catch (e) {
        // XP is a bonus layer — never block the real action because of it.
        console.warn('award failed', kind, e);
      }
    },
    [applyResult],
  );

  const answerCard = useCallback(
    async (choice: 'a' | 'b') => {
      if (!card) return;
      setCard({ ...card, chosen: choice, chosen_at: new Date().toISOString() });
      applyResult(await answerDailyCard(card.id, choice));
    },
    [card, applyResult],
  );

  const setReminder = useCallback(
    async (time: string | null) => {
      await setGamePrefs(time);
      setGame((g) => g && { ...g, reminder_time: time });
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      setGame(null);
      setCard(null);
      return;
    }
    refresh().then(() => {
      // Streak days follow the phone's timezone.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      getGameState()
        .then((g) => {
          if (g && tz && g.timezone !== tz) setGamePrefs(g.reminder_time, tz).catch(() => {});
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const value = useMemo<GameCtx>(
    () => ({ game, todayXp, badges, card, cardLoading, cardError, loadCard, answerCard, award, refresh, setReminder }),
    [game, todayXp, badges, card, cardLoading, cardError, loadCard, answerCard, award, refresh, setReminder],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Celebrate event={queue[0] ?? null} onDone={() => setQueue((q) => q.slice(1))} />
    </Ctx.Provider>
  );
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
