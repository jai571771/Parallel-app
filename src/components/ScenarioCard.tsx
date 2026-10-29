import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { Scenario } from '@/lib/types';
import { colors, pathColors, spacing } from '@/theme';
import { Card, Label, T } from './ui';

export function scenarioLabel(s: Pick<Scenario, 'kind' | 'position'>) {
  return s.kind === 'baseline' ? 'Familiar path' : `Alternative ${s.position}`;
}

export function scenarioColor(s: Pick<Scenario, 'position'>) {
  return pathColors[s.position % pathColors.length];
}

export function ScenarioCard({
  scenario,
  onPress,
  delay = 0,
  compact,
}: {
  scenario: Scenario;
  onPress?: () => void;
  delay?: number;
  compact?: boolean;
}) {
  const color = scenarioColor(scenario);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, [fade, delay]);

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Card accent={color} onPress={onPress}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Label color={color}>{scenarioLabel(scenario)}</Label>
          {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </View>
        <T variant="h2">{scenario.title}</T>
        <T color={colors.textMuted}>{scenario.tagline}</T>
        {!compact ? (
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <T variant="small" color={colors.textFaint}>
              THE PREMISE
            </T>
            <T>{scenario.premise}</T>
            <T variant="small" color={colors.textFaint} style={{ marginTop: spacing.sm }}>
              MAIN TRADE-OFF
            </T>
            <T color={colors.textMuted}>{scenario.tradeoff}</T>
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}
