import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GameBar } from '@/components/GameBar';
import { LifeScene } from '@/components/LifeScene';
import { PipSays, type PipMood } from '@/components/Pip';
import { scenarioColor } from '@/components/ScenarioCard';
import { Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { generateSnapshot, LimitError } from '@/lib/api';
import { getUsage, listPlans, listSnapshots, setTaskDone } from '@/lib/data';
import { visibleStreak } from '@/lib/game';
import { LIMITS } from '@/lib/limits';
import type { PlanTask } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';

function greeting(name: string | undefined, streak: number, doneToday: boolean, atRisk: boolean): { text: string; mood: PipMood } {
  const h = new Date().getHours();
  const hi = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const who = name ? `, ${name}` : '';
  if (doneToday) return { text: `${hi}${who}! Your streak is glowing today 🔥`, mood: 'cheer' };
  if (atRisk && streak > 0) return { text: `${hi}${who}! Your ${streak}-day streak needs you today. One tiny choice keeps it alive!`, mood: 'sleepy' };
  return { text: `${hi}${who}! Ready to peek at another possible life?`, mood: 'happy' };
}

export default function Home() {
  const { user, profile } = useUser();
  const { game, card, cardLoading, loadCard, award, refresh } = useGame();
  const [revisiting, setRevisiting] = useState(false);
  const [revisitError, setRevisitError] = useState<string | null>(null);

  const { data, error, reload, setData } = useLoad(async () => {
    const [snapshots, plans, usage] = await Promise.all([listSnapshots(), listPlans(), getUsage()]);
    return { snapshots, plans, usage };
  }, [user.id]);

  // Prepare today's card in the background so it's ready when tapped.
  useEffect(() => {
    if (profile?.onboarded) {
      loadCard();
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboarded]);

  if (profile && !profile.onboarded) return <Redirect href="/onboarding" />;
  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen scroll={false}><Loading /></Screen>;

  const latest = data.snapshots[0];
  const scenarios = latest?.scenarios ?? [];
  const activeAlt = scenarios.find((s) => s.kind === 'alternate');
  const plan = data.plans[0];
  const tasks = plan?.plan_tasks ?? [];
  const doneTasks = tasks.filter((t) => t.done).length;
  const quests = tasks.filter((t) => !t.done).slice(0, 3);
  const limits = LIMITS[profile?.plan ?? 'free'];
  const { streak, doneToday, atRisk } = visibleStreak(game);
  const hello = greeting(profile?.display_name?.split(' ')[0], streak, doneToday, atRisk);
  const showMemory = profile?.consent_memory && latest && activeAlt;

  async function completeQuest(task: PlanTask) {
    setData((d) =>
      d && {
        ...d,
        plans: d.plans.map((p) => ({ ...p, plan_tasks: p.plan_tasks?.map((t) => (t.id === task.id ? { ...t, done: true } : t)) })),
      },
    );
    await setTaskDone(task, true);
    await award(task.is_milestone ? 'milestone' : 'task_done', task.id);
  }

  async function revisit() {
    if (!latest || !activeAlt) return;
    setRevisitError(null);
    setRevisiting(true);
    try {
      const progress = tasks.length ? `Since last time they completed ${doneTasks} of ${tasks.length} plan tasks.` : undefined;
      const { snapshotId } = await generateSnapshot({
        horizonYears: latest.horizon_years,
        decision: activeAlt.decision ?? activeAlt.premise,
        labContext: progress,
        replaceOldest: true,
      });
      router.push(`/reveal/${snapshotId}`);
    } catch (e) {
      if (e instanceof LimitError) router.push('/premium');
      else setRevisitError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevisiting(false);
    }
  }

  return (
    <Screen>
      <GameBar />
      <PipSays text={hello.text} mood={hello.mood} />

      {/* Daily What-If */}
      <Pressable onPress={() => router.push('/daily')}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.9 : 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: card?.chosen ? colors.success : colors.violet }}>
            <LifeScene scene={card?.option_b.scene ?? 'balance'} color={colors.violet} emoji={card?.emoji ?? '🔮'} height={120} rounded={false} />
            <View style={{ backgroundColor: colors.card, padding: spacing.lg, gap: spacing.xs }}>
              <Label color={card?.chosen ? colors.success : colors.violetSoft}>
                {card?.chosen ? "✅ Today's What-If · done" : "🔮 Today's What-If · +10 XP"}
              </Label>
              <T variant="h3">
                {card ? card.question : cardLoading ? 'Pip is preparing your card…' : 'Tap to open your daily card'}
              </T>
              <T variant="small" color={colors.textMuted}>
                {card?.chosen ? 'See your pick again →' : 'Pick a side and see where it leads →'}
              </T>
            </View>
          </View>
        )}
      </Pressable>

      {/* Quests */}
      {quests.length ? (
        <Card accent={colors.orange} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label color={colors.orange}>⚔️ Today's quests</Label>
            <T variant="small" color={colors.textFaint}>{doneTasks}/{tasks.length} done</T>
          </View>
          {quests.map((t) => (
            <Pressable key={t.id} onPress={() => completeQuest(t)} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Ionicons name={t.is_milestone ? 'flag-outline' : 'ellipse-outline'} size={24} color={t.is_milestone ? colors.orange : colors.textMuted} />
              <T style={{ flex: 1 }}>{t.title}</T>
              <T variant="small" color="#FFE66D">+{t.is_milestone ? 25 : 10}</T>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {showMemory ? (
        <Card accent={colors.cyan}>
          <Label>👋 Pick up where you left off</Label>
          <T>
            Last time you explored "{activeAlt.title}".
            {tasks.length ? ` You've finished ${doneTasks} of ${tasks.length} steps since.` : ''} Want to see that life again with
            your new progress?
          </T>
          {revisitError ? <ErrorBox message={revisitError} /> : null}
          <Button title="Revisit this life" variant="secondary" icon="refresh" loading={revisiting} onPress={revisit} />
        </Card>
      ) : null}

      {latest ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T variant="h2">Your possible lives</T>
            <T variant="small" color={colors.violetSoft} onPress={() => router.push(`/compare/${latest.id}`)}>
              Compare →
            </T>
          </View>
          <T color={colors.textMuted}>{latest.title}</T>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {scenarios.slice(0, 2).map((s) => (
              <Pressable key={s.id} style={{ flex: 1 }} onPress={() => router.push(`/scenario/${s.id}`)}>
                <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: scenarioColor(s) }}>
                  <LifeScene scene={s.scene} color={scenarioColor(s)} emoji={s.emoji} height={100} rounded={false} animate={false} />
                  <View style={{ padding: spacing.md, backgroundColor: colors.card, gap: 2 }}>
                    <T variant="h3" numberOfLines={1}>{s.title}</T>
                    <T variant="small" color={colors.textMuted} numberOfLines={2}>{s.tagline}</T>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Card>
          <T variant="h3">No lives explored yet</T>
          <T color={colors.textMuted}>Answer a few questions and see two possible versions of your future.</T>
          <Button title="Explore my lives" icon="sparkles" onPress={() => router.navigate('/lab')} />
        </Card>
      )}

      <Button title="Explore another path" icon="git-branch-outline" variant="secondary" onPress={() => router.navigate('/lab')} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, alignItems: 'center' }}>
        <Text>🔋</Text>
        <T variant="small" color={colors.textFaint}>
          {data.usage.generations}/{limits.generationsPerMonth} big explorations used this month
        </T>
      </View>
      <Disclaimer />
    </Screen>
  );
}
