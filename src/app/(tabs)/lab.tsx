import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, Chip, Disclaimer, ErrorBox, Field, Label, Screen, T } from '@/components/ui';
import { generateSnapshot, LimitError } from '@/lib/api';
import { computeLab, computeSavings } from '@/lib/calc';
import { listSnapshots } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

const IDEAS = [
  'Learn AI for 2 hours every day',
  'Start a business alongside my studies/job',
  'Switch to a different career',
  'Move to another city',
  'Take a corporate job first, start a company later',
];

export default function Lab() {
  const params = useLocalSearchParams<{ decision?: string; snapshotId?: string }>();
  const { profile } = useUser();
  const plan = profile?.plan ?? 'free';
  const limits = LIMITS[plan];
  const { data: snapshots } = useLoad(listSnapshots);

  const [hoursPerDay, setHours] = useState(profile?.hours_available ?? 2);
  const [daysPerWeek, setDays] = useState(5);
  const [consistency, setConsistency] = useState(0.7);
  const [years, setYears] = useState(3);
  const [monthly, setMonthly] = useState(2000);
  const [rate, setRate] = useState(0);

  const [decision, setDecision] = useState('');
  const [mode, setMode] = useState<'new' | 'add'>('new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from deep links (Home's "life question", scenario's "change one decision").
  useEffect(() => {
    if (params.decision) setDecision(params.decision);
    if (params.snapshotId) setMode('add');
  }, [params.decision, params.snapshotId]);

  const lab = useMemo(() => computeLab({ hoursPerDay, daysPerWeek, consistency, years }), [hoursPerDay, daysPerWeek, consistency, years]);
  const savings = useMemo(() => computeSavings(monthly, years, rate), [monthly, years, rate]);

  const target = snapshots?.find((s) => s.id === params.snapshotId) ?? snapshots?.[0];

  async function explore(replaceOldest = false) {
    setError(null);
    setBusy(true);
    try {
      const labContext = `Decision Lab inputs: ${lab.formula} focused hours over ${years} years.`;
      const { snapshotId } = await generateSnapshot({
        horizonYears: years,
        decision: decision.trim() || undefined,
        labContext,
        snapshotId: mode === 'add' && target ? target.id : undefined,
        replaceOldest,
      });
      setDecision('');
      router.push(`/reveal/${snapshotId}`);
    } catch (e) {
      if (e instanceof LimitError && e.limit === 'saved_snapshots') {
        Alert.alert(
          'Replace your saved snapshot?',
          `The free plan keeps ${limits.savedSnapshots} snapshot. Replace your oldest one with this new exploration, or upgrade to keep more.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'See Plus', onPress: () => router.push('/premium') },
            { text: 'Replace', style: 'destructive', onPress: () => explore(true) },
          ],
        );
      } else if (e instanceof LimitError) {
        router.push('/premium');
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Label>Decision Lab</Label>
        <T variant="h1">Change an assumption. See what it means.</T>

        <Card style={{ gap: spacing.md }}>
          <T variant="h3">Time you invest</T>
          <SliderRow label="Extra hours per day" value={`${hoursPerDay.toFixed(1)} h`} min={0} max={6} step={0.5} v={hoursPerDay} set={setHours} color={colors.cyan} />
          <SliderRow label="Days per week" value={`${daysPerWeek}`} min={1} max={7} step={1} v={daysPerWeek} set={setDays} color={colors.cyan} />
          <SliderRow label="Consistency with the plan" value={`${Math.round(consistency * 100)}%`} min={0.2} max={1} step={0.05} v={consistency} set={setConsistency} color={colors.violet} />
          <T variant="small" color={colors.textMuted}>Time horizon</T>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {LIMITS.plus.horizons.map((y) => {
              const allowed = limits.horizons.includes(y);
              return (
                <Chip
                  key={y}
                  label={`${y} yr${allowed ? '' : ' · Plus'}`}
                  selected={years === y}
                  color={colors.cyan}
                  onPress={() => (allowed ? setYears(y) : router.push('/premium'))}
                />
              );
            })}
          </View>
        </Card>

        <Card accent={colors.cyan}>
          <Label>Focused hours (estimate)</Label>
          <T variant="h1" color={colors.cyan} style={{ fontSize: 40 }}>
            {lab.focusedHours.toLocaleString()} h
          </T>
          <T variant="small" color={colors.textMuted}>{lab.formula}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
            {lab.equivalents.map((e) => (
              <View key={e.label} style={{ width: '46%' }}>
                <T variant="h3">{e.value}</T>
                <T variant="small" color={colors.textFaint}>{e.label}</T>
              </View>
            ))}
          </View>
          <Disclaimer text="A planning estimate from the formula above — not a forecast of skill or career success." />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <T variant="h3">Money trade-off (illustrative)</T>
          <SliderRow label="Set aside per month" value={`₹${monthly.toLocaleString()}`} min={0} max={30000} step={500} v={monthly} set={setMonthly} color={colors.orange} />
          <SliderRow label="Assumed yearly return" value={`${rate}%`} min={0} max={12} step={1} v={rate} set={setRate} color={colors.orange} />
          <T>
            Over {years} years: <T color={colors.orange} variant="h3">₹{savings.total.toLocaleString()}</T>
            <T color={colors.textMuted}> (₹{savings.contributed.toLocaleString()} contributed)</T>
          </T>
          <Disclaimer text="Uses only the assumptions you set. Not financial advice — talk to a qualified adviser for real decisions." />
        </Card>

        <Card accent={colors.violet} style={{ gap: spacing.md }}>
          <Label color={colors.violetSoft}>What if…</Label>
          <T variant="h3">Explore a different choice with these assumptions</T>
          <Field value={decision} onChangeText={setDecision} placeholder="What if I…" multiline />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {IDEAS.map((i) => (
              <Chip key={i} label={i} selected={decision === i} onPress={() => setDecision(i)} />
            ))}
          </View>
          {target ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Chip label="New snapshot" selected={mode === 'new'} color={colors.cyan} onPress={() => setMode('new')} />
              <Chip label={`Add path to "${target.title}"`} selected={mode === 'add'} color={colors.cyan} onPress={() => setMode('add')} />
            </View>
          ) : null}
          {error ? <ErrorBox message={error} /> : null}
          <Button title="Explore this life" icon="sparkles" loading={busy} disabled={!decision.trim()} onPress={() => explore()} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  v,
  set,
  color,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  v: number;
  set: (n: number) => void;
  color: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="small" color={colors.textMuted}>{label}</T>
        <T variant="small" style={{ fontWeight: '700' }}>{value}</T>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={v}
        onValueChange={set}
        minimumTrackTintColor={color}
        maximumTrackTintColor={colors.border}
        thumbTintColor={color}
      />
    </View>
  );
}
