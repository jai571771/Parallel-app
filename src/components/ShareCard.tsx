import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Scenario } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';
import { LifeMap } from './LifeMap';
import { scenarioColor } from './ScenarioCard';
import { T } from './ui';

export type ShareTheme = 'night' | 'violet' | 'dawn';

const themes: Record<ShareTheme, [string, string, string]> = {
  night: ['#1A1446', '#0E1330', '#0B1020'],
  violet: ['#3B1F8F', '#1E1652', '#0B1020'],
  dawn: ['#4A2148', '#22183F', '#0B1020'],
};

export type ShareCardRef = ComponentRef<typeof View>;

/**
 * Privacy-safe "Two lives. One decision." card. It only shows path titles and
 * taglines — never profile details — so the user controls what leaves the app.
 */
export function ShareCard({
  paths,
  question,
  theme = 'night',
  ref,
}: {
  paths: Pick<Scenario, 'title' | 'tagline' | 'position'>[];
  question: string;
  theme?: ShareTheme;
  ref?: Ref<ShareCardRef>;
}) {
  return (
    <View ref={ref} collapsable={false} style={styles.wrap}>
      <LinearGradient colors={themes[theme]} style={styles.card}>
        <T variant="label" color={colors.cyan}>PARALLEL</T>
        <T variant="h2">
          {paths.length > 1 ? `${paths.length === 2 ? 'Two' : paths.length} possible lives. One choice.` : 'The life I almost chose.'}
        </T>
        <LifeMap branches={paths.map((p) => ({ color: scenarioColor(p) }))} height={120} animate={false} />
        <View style={styles.row}>
          {paths.map((p, i) => {
            const c = scenarioColor(p);
            return (
              <View key={i} style={[styles.path, { borderColor: c, backgroundColor: c + '1F' }]}>
                <T variant="label" color={c} numberOfLines={2}>{p.title}</T>
                <T variant="small" color={colors.text}>{p.tagline}</T>
              </View>
            );
          })}
        </View>
        <T variant="h3" style={{ textAlign: 'center' }}>{question}</T>
        <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
          Illustrative scenarios, not predictions · parallel app
        </T>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden' },
  card: { padding: spacing.xl, gap: spacing.lg, borderRadius: radius.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  path: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, minHeight: 110 },
});
