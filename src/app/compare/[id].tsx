import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { hasMeters, MeterChip } from '@/components/LifeMeters';
import { LifeScene } from '@/components/LifeScene';
import { PipSays } from '@/components/Pip';
import { scenarioColor } from '@/components/ScenarioCard';
import { Bullets, Button, Card, Chip, Disclaimer, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { getSnapshot } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import type { Scenario } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { METERS } from '@/lib/visual';
import { useUser } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

type Row = { key: string; label: string; render: (s: Scenario) => React.ReactNode; plus?: boolean };

const ROWS: Row[] = [
  { key: 'premise', label: '🎬 What you do', render: (s) => <T variant="small">{s.premise}</T> },
  { key: 'pros', label: '👍 Good parts', render: (s) => <Bullets items={s.pros} color={colors.success} /> },
  { key: 'cons', label: '🤔 Hard parts', render: (s) => <Bullets items={s.cons} color={colors.orange} /> },
  { key: 'tradeoff', label: '⚖️ What you get / give up', render: (s) => <T variant="small" color={colors.textMuted}>{s.tradeoff}</T> },
  { key: 'requires', label: '🧰 What it takes', render: (s) => <Bullets items={s.requirements} />, plus: true },
  { key: 'risks', label: '🌧️ What could go wrong', render: (s) => <Bullets items={s.risks} color={colors.orange} />, plus: true },
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
  const showMeters = chosen.some((s) => hasMeters(s.meters));

  const toggle = (sid: string) => {
    const cur = chosenIds;
    if (cur.includes(sid)) return setSelected(cur.filter((x) => x !== sid));
    if (cur.length >= maxCompare) return setSelected([...cur.slice(1), sid]);
    setSelected([...cur, sid]);
  };

  const colWidth = chosen.length > 2 ? 190 : undefined;
  const col = { flex: colWidth ? undefined : 1, width: colWidth };

  return (
    <Screen edges={[]}>
      <PipSays mood="thinking" size={52} text="No life is 'right'. Which good parts matter most to you?" />
      {all.length > 2 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {all.map((s) => (
            <Chip key={s.id} label={`${s.emoji ?? ''} ${s.title}`} selected={chosenIds.includes(s.id)} color={scenarioColor(s)} onPress={() => toggle(s.id)} />
          ))}
        </View>
      ) : null}

      <ScrollView horizontal={chosen.length > 2} showsHorizontalScrollIndicator={false}>
        <View style={{ gap: spacing.md, flex: 1 }}>
          {/* Scene headers */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {chosen.map((s) => (
              <Card key={s.id} accent={scenarioColor(s)} style={{ ...col, padding: 0, overflow: 'hidden' }} onPress={() => router.push(`/scenario/${s.id}`)}>
                <LifeScene scene={s.scene} color={scenarioColor(s)} emoji={s.emoji} height={90} rounded={false} animate={false} />
                <View style={{ padding: spacing.md }}>
                  <T variant="h3" numberOfLines={2}>{s.title}</T>
                </View>
              </Card>
            ))}
          </View>

          {/* Meters, row by row so differences line up */}
          {showMeters ? (
            <Card style={{ gap: spacing.md }}>
              <Label>📊 How life could change</Label>
              {METERS.map(({ key, icon, label }) => (
                <View key={key} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                    <T variant="small" color={colors.textMuted}>{label}</T>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {chosen.map((s) => {
                      const m = s.meters[key];
                      return (
                        <View key={s.id} style={{ ...col, alignItems: 'flex-start' }}>
                          {m ? <MeterChip level={m.level} /> : <T variant="small" color={colors.textFaint}>—</T>}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {rows.map((row) => (
            <View key={row.key} style={{ gap: spacing.sm }}>
              <T variant="h3">{row.label}</T>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {chosen.map((s) => (
                  <Card key={s.id} style={{ ...col, padding: spacing.md }}>
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
          <T variant="h3">See even more</T>
          <T color={colors.textMuted}>
            PARALLEL Plus adds "what it takes", "what could go wrong" and up to {LIMITS.plus.alternatesPerSnapshot + 1} lives side by side.
          </T>
          <Button title="Explore Plus" variant="secondary" onPress={() => router.push('/premium')} />
        </Card>
      ) : null}

      <Button title="Share this comparison" icon="share-social-outline" variant="secondary" onPress={() => router.push(`/share/${snap.id}`)} />
      <Disclaimer />
    </Screen>
  );
}
