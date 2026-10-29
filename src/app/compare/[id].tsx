import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { scenarioColor, scenarioLabel } from '@/components/ScenarioCard';
import { Bullets, Button, Card, Chip, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { LIMITS } from '@/lib/limits';
import { getSnapshot } from '@/lib/data';
import type { Scenario } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

type Row = { key: string; label: string; render: (s: Scenario) => React.ReactNode; plus?: boolean };

const ROWS: Row[] = [
  { key: 'premise', label: 'The premise', render: (s) => <T variant="small">{s.premise}</T> },
  { key: 'tradeoff', label: 'Main trade-off', render: (s) => <T variant="small" color={colors.textMuted}>{s.tradeoff}</T> },
  { key: 'requires', label: 'Required effort', render: (s) => <Bullets items={s.requirements.slice(0, 4)} /> },
  { key: 'risks', label: 'Uncertainty & risk', render: (s) => <Bullets items={s.risks.slice(0, 4)} color={colors.orange} />, plus: true },
  {
    key: 'dims',
    label: 'Across your life',
    plus: true,
    render: (s) => (
      <View style={{ gap: spacing.sm }}>
        {s.dimensions.map((d, i) => (
          <View key={i}>
            <T variant="small" color={colors.text} style={{ fontWeight: '700' }}>{d.area}</T>
            <T variant="small" color={colors.textMuted}>{d.outlook}</T>
          </View>
        ))}
      </View>
    ),
  },
  { key: 'change', label: 'What could change it', render: (s) => <T variant="small" color={colors.textMuted}>{s.what_could_change}</T>, plus: true },
];

export default function Compare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUser();
  const isPlus = profile?.plan === 'plus';
  const { data: snap, error, reload } = useLoad(() => getSnapshot(id), [id]);
  const [selected, setSelected] = useState<string[] | null>(null);

  if (error) return <Screen edges={[]}><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!snap) return <Screen edges={[]} scroll={false}><Loading /></Screen>;

  const all = snap.scenarios ?? [];
  const chosenIds = selected ?? all.slice(0, 2).map((s) => s.id);
  const chosen = all.filter((s) => chosenIds.includes(s.id));
  const rows = isPlus ? ROWS : ROWS.filter((r) => !r.plus);
  const maxCompare = isPlus ? 3 : 2;

  const toggle = (sid: string) => {
    const cur = chosenIds;
    if (cur.includes(sid)) return setSelected(cur.filter((x) => x !== sid));
    if (cur.length >= maxCompare) return setSelected([...cur.slice(1), sid]);
    setSelected([...cur, sid]);
  };

  const colWidth = chosen.length > 2 ? 200 : undefined;

  return (
    <Screen edges={[]}>
      <T variant="h2">{snap.title}</T>
      {all.length > 2 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {all.map((s) => (
            <Chip key={s.id} label={s.title} selected={chosenIds.includes(s.id)} color={scenarioColor(s)} onPress={() => toggle(s.id)} />
          ))}
        </View>
      ) : null}

      <ScrollView horizontal={chosen.length > 2} showsHorizontalScrollIndicator={false}>
        <View style={{ gap: spacing.md, flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {chosen.map((s) => (
              <Card key={s.id} accent={scenarioColor(s)} style={{ flex: colWidth ? undefined : 1, width: colWidth }} onPress={() => router.push(`/scenario/${s.id}`)}>
                <Label color={scenarioColor(s)}>{scenarioLabel(s)}</Label>
                <T variant="h3">{s.title}</T>
              </Card>
            ))}
          </View>
          {rows.map((row) => (
            <View key={row.key} style={{ gap: spacing.sm }}>
              <Label color={colors.textFaint}>{row.label}</Label>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {chosen.map((s) => (
                  <Card key={s.id} style={{ flex: colWidth ? undefined : 1, width: colWidth, padding: spacing.md }}>
                    {row.render(s)}
                  </Card>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {!isPlus ? (
        <Card accent={colors.violet}>
          <T variant="h3">See the full picture</T>
          <T color={colors.textMuted}>
            PARALLEL Plus adds risks, life-area breakdowns and up to {LIMITS.plus.alternatesPerSnapshot + 1} paths side by side.
          </T>
          <Button title="Explore Plus" variant="secondary" onPress={() => router.push('/premium')} />
        </Card>
      ) : null}

      <Card>
        <T variant="h3">Which one fits your priorities?</T>
        <T color={colors.textMuted}>
          There is no "right" path here. Notice which trade-offs you'd happily accept, and which ones make you hesitate.
        </T>
      </Card>
      <Button title="Share this comparison" icon="share-social-outline" variant="secondary" onPress={() => router.push(`/share/${snap.id}`)} />
      <Disclaimer />
    </Screen>
  );
}
