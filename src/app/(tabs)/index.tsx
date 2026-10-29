import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LifeMap } from '@/components/LifeMap';
import { ScenarioCard, scenarioColor } from '@/components/ScenarioCard';
import { Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { generateSnapshot, LimitError } from '@/lib/api';
import { getUsage, listPlans, listSnapshots } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

const FEATURED_QUESTIONS = [
  'What if I spent the next year learning AI for two hours every day?',
  'What if I focused on building a startup instead of preparing for a corporate job?',
  'What if I moved to another city?',
  'What if I continued my current habits for another five years?',
  'What if I chose a different career?',
  'What if I stopped procrastinating and became more consistent?',
];

export default function Home() {
  const { user, profile } = useUser();
  const [revisiting, setRevisiting] = useState(false);
  const [revisitError, setRevisitError] = useState<string | null>(null);

  const { data, error, reload } = useLoad(async () => {
    const [snapshots, plans, usage] = await Promise.all([listSnapshots(), listPlans(), getUsage()]);
    return { snapshots, plans, usage };
  }, [user.id]);

  if (profile && !profile.onboarded) return <Redirect href="/onboarding" />;
  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen scroll={false}><Loading /></Screen>;

  const latest = data.snapshots[0];
  const scenarios = latest?.scenarios ?? [];
  const activeAlt = scenarios.find((s) => s.kind === 'alternate');
  const plan = data.plans[0];
  const doneTasks = plan?.plan_tasks?.filter((t) => t.done).length ?? 0;
  const totalTasks = plan?.plan_tasks?.length ?? 0;
  const limits = LIMITS[profile?.plan ?? 'free'];
  const question = FEATURED_QUESTIONS[new Date().getDate() % FEATURED_QUESTIONS.length];
  const firstName = profile?.display_name?.split(' ')[0];
  const showMemory = profile?.consent_memory && latest && activeAlt;

  async function revisit() {
    if (!latest || !activeAlt) return;
    setRevisitError(null);
    setRevisiting(true);
    try {
      const progress = totalTasks ? `Since last time they completed ${doneTasks} of ${totalTasks} plan tasks.` : undefined;
      const { snapshotId } = await generateSnapshot({
        horizonYears: latest.horizon_years,
        decision: activeAlt.decision ?? activeAlt.premise,
        labContext: progress,
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
      <Label>{firstName ? `Hi ${firstName}` : 'PARALLEL'}</Label>
      <T variant="h1">Your life isn't one straight line.</T>

      <Card accent={colors.violet} onPress={() => router.navigate({ pathname: '/lab', params: { decision: question } })}>
        <Label color={colors.violetSoft}>Today's life question</Label>
        <T variant="h3">{question}</T>
        <T variant="small" color={colors.textMuted}>Tap to explore it in the Decision Lab →</T>
      </Card>

      {showMemory ? (
        <Card accent={colors.cyan}>
          <Label>Pick up where you left off</Label>
          <T>
            Last time, you explored "{activeAlt.title}".
            {totalTasks ? ` You've completed ${doneTasks} of ${totalTasks} steps in your plan since.` : ''} Want to revisit
            that path with your updated situation?
          </T>
          {revisitError ? <ErrorBox message={revisitError} /> : null}
          <Button title="Revisit this path" variant="secondary" icon="refresh" loading={revisiting} onPress={revisit} />
        </Card>
      ) : null}

      {latest ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T variant="h2">Your active snapshot</T>
            <T variant="small" color={colors.violetSoft} onPress={() => router.push(`/compare/${latest.id}`)}>
              Compare
            </T>
          </View>
          <Card onPress={() => router.push(`/reveal/${latest.id}`)}>
            <T variant="h3">{latest.title}</T>
            <LifeMap branches={scenarios.map((s) => ({ color: scenarioColor(s) }))} height={110} animate={false} />
          </Card>
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.id} scenario={s} compact delay={i * 120} onPress={() => router.push(`/scenario/${s.id}`)} />
          ))}
        </>
      ) : (
        <Card>
          <T variant="h3">No snapshot yet</T>
          <T color={colors.textMuted}>Create your first life snapshot to see your current trajectory and one alternate path.</T>
          <Button title="Create my snapshot" icon="sparkles" onPress={() => router.navigate('/lab')} />
        </Card>
      )}

      {plan ? (
        <Card onPress={() => router.navigate('/plan')}>
          <Label color={colors.orange}>Your next steps</Label>
          <T variant="h3">{plan.title}</T>
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: radius.pill }}>
            <View
              style={{
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.orange,
                width: `${totalTasks ? (doneTasks / totalTasks) * 100 : 0}%`,
              }}
            />
          </View>
          <T variant="small" color={colors.textMuted}>{doneTasks}/{totalTasks} done</T>
        </Card>
      ) : null}

      <Button title="Explore another path" icon="git-branch-outline" variant="secondary" onPress={() => router.navigate('/lab')} />

      <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
        {data.usage.generations}/{limits.generationsPerMonth} explorations used this month
      </T>
      <Disclaimer />
    </Screen>
  );
}
