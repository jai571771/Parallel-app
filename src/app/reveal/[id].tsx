import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { LifeMap } from '@/components/LifeMap';
import { ScenarioCard, scenarioColor } from '@/components/ScenarioCard';
import { Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { getSnapshot } from '@/lib/data';
import { useLoad } from '@/lib/useLoad';
import { colors, spacing } from '@/theme';

/** "Meet Your Future Self" — the signature reveal after a snapshot is generated. */
export default function Reveal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: snap, error, reload } = useLoad(() => getSnapshot(id), [id]);

  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!snap) return <Screen scroll={false}><Loading /></Screen>;

  const scenarios = snap.scenarios ?? [];

  return (
    <Screen>
      <Label>Your parallel lives · {snap.horizon_years} years</Label>
      <T variant="h1">{snap.title}</T>
      <LifeMap branches={scenarios.map((s) => ({ color: scenarioColor(s) }))} height={180} />

      {snap.insight ? (
        <Card accent={colors.cyan}>
          <Label>Your current trajectory</Label>
          <T>{snap.insight}</T>
        </Card>
      ) : null}

      {scenarios.map((s, i) => (
        <ScenarioCard key={s.id} scenario={s} delay={300 + i * 250} onPress={() => router.push(`/scenario/${s.id}`)} />
      ))}

      <Disclaimer />

      <View style={{ gap: spacing.sm }}>
        <Button title="Compare my futures" icon="git-compare-outline" onPress={() => router.push(`/compare/${snap.id}`)} />
        <Button title="Share my parallel lives" icon="share-social-outline" variant="secondary" onPress={() => router.push(`/share/${snap.id}`)} />
        <Button title="Go to my home" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
