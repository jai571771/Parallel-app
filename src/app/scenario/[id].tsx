import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { hasMeters, LifeMeters } from '@/components/LifeMeters';
import { LifeScene } from '@/components/LifeScene';
import { PipSays } from '@/components/Pip';
import { ProsCons } from '@/components/ProsCons';
import { scenarioColor, scenarioLabel } from '@/components/ScenarioCard';
import { Bullets, Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { generateNarrative, generatePlan, LimitError } from '@/lib/api';
import { getScenario } from '@/lib/data';
import { useLoad } from '@/lib/useLoad';
import { useGame } from '@/providers/GameProvider';
import { colors, spacing } from '@/theme';

export default function ScenarioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, error, reload, setData } = useLoad(() => getScenario(id), [id]);
  const { award } = useGame();
  const [busy, setBusy] = useState<'narrative' | 'plan' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showGuesses, setShowGuesses] = useState(false);

  if (error) return <Screen edges={[]}><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!s) return <Screen edges={[]} scroll={false}><Loading /></Screen>;

  const color = scenarioColor(s);

  async function run(kind: 'narrative' | 'plan') {
    if (!s) return;
    setActionError(null);
    setBusy(kind);
    try {
      if (kind === 'narrative') {
        const { narrative } = await generateNarrative(s.id);
        setData({ ...s, narrative });
        award('story', s.id);
      } else {
        const { planId } = await generatePlan(s.id);
        award('plan', planId);
        router.navigate('/plan');
      }
    } catch (e) {
      if (e instanceof LimitError) router.push('/premium');
      else setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen edges={[]}>
      <LifeScene scene={s.scene} color={color} emoji={s.emoji} height={190} />
      <View style={{ gap: 2 }}>
        <Label color={color}>{scenarioLabel(s)}</Label>
        <T variant="h1">{s.title}</T>
        <T color={colors.textMuted}>{s.tagline}</T>
      </View>

      <Section icon="🎬" title="What you do" color={color}>
        <T>{s.premise}</T>
      </Section>

      <Section icon="🔮" title="What life could look like">
        <T color={colors.textMuted}>{s.summary}</T>
      </Section>

      {hasMeters(s.meters) ? (
        <Section icon="📊" title="How your life could change">
          <LifeMeters meters={s.meters} />
        </Section>
      ) : s.dimensions.length ? (
        <Section icon="📊" title="How your life could change">
          {s.dimensions.map((d, i) => (
            <View key={i} style={{ gap: 2, marginTop: i ? spacing.sm : 0 }}>
              <T variant="h3">{d.area}</T>
              <T color={colors.textMuted}>{d.outlook}</T>
            </View>
          ))}
        </Section>
      ) : null}

      <ProsCons pros={s.pros} cons={s.cons} />

      <Section icon="⚖️" title="What you get, what you give up" color={colors.orange}>
        <T>{s.tradeoff}</T>
      </Section>

      {s.requirements.length ? (
        <Section icon="🧰" title="What it takes">
          <Bullets items={s.requirements} />
        </Section>
      ) : null}

      {s.risks.length ? (
        <Section icon="🌧️" title="Things that could go wrong" color={colors.orange}>
          <Bullets items={s.risks} color={colors.orange} />
        </Section>
      ) : null}

      <Section icon="🔄" title="What could change this">
        <T color={colors.textMuted}>{s.what_could_change}</T>
      </Section>

      <Card style={{ backgroundColor: colors.bgElevated }}>
        <Pressable onPress={() => setShowGuesses((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T variant="h3">🤔 We guessed that…</T>
          <T color={colors.violetSoft}>{showGuesses ? 'Hide' : 'Show'}</T>
        </Pressable>
        {showGuesses ? <Bullets items={s.assumptions} color={colors.textFaint} /> : null}
      </Card>

      <Card accent={colors.violet}>
        <Label color={colors.violetSoft}>📖 Meet your future self · +10 XP</Label>
        {s.narrative ? (
          <T style={{ lineHeight: 24 }}>{s.narrative}</T>
        ) : (
          <>
            <PipSays mood="happy" size={52} text="Want to read a short story about one day in this life?" />
            <Button title="Tell me the story" icon="book-outline" loading={busy === 'narrative'} disabled={!!busy} onPress={() => run('narrative')} />
          </>
        )}
      </Card>

      {actionError ? <ErrorBox message={actionError} /> : null}

      <Button title="Build this future (+15 XP)" icon="rocket-outline" loading={busy === 'plan'} disabled={!!busy} onPress={() => run('plan')} />
      <Button title="Change one decision" icon="flask-outline" variant="secondary" onPress={() => router.navigate({ pathname: '/lab', params: { snapshotId: s.snapshot_id } })} />
      <Button title="Compare my lives" variant="ghost" onPress={() => router.push(`/compare/${s.snapshot_id}`)} />
      <Disclaimer />
    </Screen>
  );
}

function Section({ icon, title, color, children }: { icon: string; title: string; color?: string; children: React.ReactNode }) {
  return (
    <Card accent={color}>
      <T variant="h3">{icon} {title}</T>
      {children}
    </Card>
  );
}
