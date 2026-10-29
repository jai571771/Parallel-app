import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { scenarioColor, scenarioLabel } from '@/components/ScenarioCard';
import { Bullets, Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { generateNarrative, generatePlan, LimitError } from '@/lib/api';
import { getScenario } from '@/lib/data';
import { useLoad } from '@/lib/useLoad';
import { colors, spacing } from '@/theme';

export default function ScenarioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, error, reload, setData } = useLoad(() => getScenario(id), [id]);
  const [busy, setBusy] = useState<'narrative' | 'plan' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      } else {
        await generatePlan(s.id);
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
      <Label color={color}>{scenarioLabel(s)}</Label>
      <T variant="h1">{s.title}</T>
      <T color={colors.textMuted}>{s.tagline}</T>

      <Card accent={color}>
        <Label color={color}>The premise</Label>
        <T>{s.premise}</T>
      </Card>

      <Card>
        <Label>A possible scenario</Label>
        <T color={colors.textMuted}>{s.summary}</T>
      </Card>

      {s.dimensions.length ? (
        <Card>
          <Label>Across your life</Label>
          {s.dimensions.map((d, i) => (
            <View key={i} style={{ gap: 2, marginTop: i ? spacing.sm : 0 }}>
              <T variant="h3">{d.area}</T>
              <T color={colors.textMuted}>{d.outlook}</T>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label color={colors.orange}>Main trade-off</Label>
        <T>{s.tradeoff}</T>
      </Card>

      {s.requirements.length ? (
        <Card>
          <Label>What this path asks of you</Label>
          <Bullets items={s.requirements} />
        </Card>
      ) : null}

      {s.risks.length ? (
        <Card>
          <Label color={colors.orange}>Uncertainties & risks</Label>
          <Bullets items={s.risks} color={colors.orange} />
        </Card>
      ) : null}

      <Card>
        <Label color={colors.violetSoft}>What could change this path</Label>
        <T color={colors.textMuted}>{s.what_could_change}</T>
      </Card>

      <Card style={{ backgroundColor: colors.bgElevated }}>
        <Label color={colors.textFaint}>Assumptions behind this scenario</Label>
        <Bullets items={s.assumptions} color={colors.textFaint} />
      </Card>

      <Card accent={colors.violet}>
        <Label color={colors.violetSoft}>Meet your future self</Label>
        {s.narrative ? (
          <T style={{ lineHeight: 24 }}>{s.narrative}</T>
        ) : (
          <>
            <T color={colors.textMuted}>
              Read a short story about an ordinary day in this possible life.
            </T>
            <Button title="Write my future-self story" icon="book-outline" loading={busy === 'narrative'} disabled={!!busy} onPress={() => run('narrative')} />
          </>
        )}
      </Card>

      {actionError ? <ErrorBox message={actionError} /> : null}

      <Button title="Build this future" icon="rocket-outline" loading={busy === 'plan'} disabled={!!busy} onPress={() => run('plan')} />
      <Button title="Change one decision" icon="flask-outline" variant="secondary" onPress={() => router.navigate({ pathname: '/lab', params: { snapshotId: s.snapshot_id } })} />
      <Button title="Compare my futures" variant="ghost" onPress={() => router.push(`/compare/${s.snapshot_id}`)} />
      <Disclaimer />
    </Screen>
  );
}
