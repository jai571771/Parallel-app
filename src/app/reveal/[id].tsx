import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { LifeMeters } from '@/components/LifeMeters';
import { LifeScene } from '@/components/LifeScene';
import { PipSays } from '@/components/Pip';
import { ProsCons } from '@/components/ProsCons';
import { scenarioColor, scenarioLabel } from '@/components/ScenarioCard';
import { Button, Card, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { getSnapshot } from '@/lib/data';
import type { Scenario } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { useGame } from '@/providers/GameProvider';
import { colors, spacing } from '@/theme';

/** "Meet your possible lives" — the visual reveal after a snapshot is generated. */
export default function Reveal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: snap, error, reload } = useLoad(() => getSnapshot(id), [id]);
  const { award } = useGame();

  useEffect(() => {
    if (snap) award('snapshot', snap.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.id]);

  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!snap) return <Screen scroll={false}><Loading /></Screen>;

  const scenarios = snap.scenarios ?? [];

  return (
    <Screen>
      <Label>Your possible lives · {snap.horizon_years} years from now</Label>
      <T variant="h1">{snap.title}</T>
      <PipSays mood="wow" text={scenarios.length > 2 ? `Here are ${scenarios.length} ways your life could go!` : 'Here are two ways your life could go! Tap one to see more.'} />

      {snap.insight ? (
        <Card accent={colors.cyan}>
          <Label>📍 Where you are now</Label>
          <T>{snap.insight}</T>
        </Card>
      ) : null}

      {scenarios.map((s, i) => (
        <LifeCard key={s.id} scenario={s} delay={250 + i * 300} />
      ))}

      <Disclaimer />

      <View style={{ gap: spacing.sm }}>
        <Button title="Compare side by side" icon="git-compare-outline" onPress={() => router.push(`/compare/${snap.id}`)} />
        <Button title="Share my two lives" icon="share-social-outline" variant="secondary" onPress={() => router.push(`/share/${snap.id}`)} />
        <Button title="Go to home" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

function LifeCard({ scenario: s, delay }: { scenario: Scenario; delay: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const color = scenarioColor(s);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 550, delay, useNativeDriver: true }).start();
  }, [fade, delay]);

  return (
    <Animated.View
      style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}
    >
      <Card accent={color} style={{ padding: 0, overflow: 'hidden' }} onPress={() => router.push(`/scenario/${s.id}`)}>
        <LifeScene scene={s.scene} color={color} emoji={s.emoji} height={160} rounded={false} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Label color={color}>{scenarioLabel(s)}</Label>
            <T variant="h2">{s.title}</T>
            <T color={colors.textMuted}>{s.tagline}</T>
          </View>
          <LifeMeters meters={s.meters} />
          <ProsCons pros={s.pros} cons={s.cons} />
          {!s.pros.length ? <T color={colors.textMuted}>{s.premise}</T> : null}
          <Button title="See this life" variant="secondary" icon="arrow-forward" onPress={() => router.push(`/scenario/${s.id}`)} />
        </View>
      </Card>
    </Animated.View>
  );
}
