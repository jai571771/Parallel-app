import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Button, Card, Chip, Disclaimer, ErrorBox, Field, Label, Loading, Screen, T } from '@/components/ui';
import { generateSnapshot, LimitError } from '@/lib/api';
import { updateProfile } from '@/lib/data';
import { useAuth, useUser } from '@/providers/AuthProvider';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';

const STAGES = ['School student', 'College student', 'Early career', 'Mid career', 'Founder / freelancer', 'Career break', 'Other'];
const AGES = ['Under 18', '18–21', '22–25', '26–30', '31–40', '40+'];
const INTERESTS = ['Technology', 'AI', 'Business', 'Design', 'Writing', 'Science', 'Health & fitness', 'Finance', 'Music', 'Teaching', 'Social impact', 'Travel', 'Sports', 'Content creation'];
const AMBITIONS = ['Build a tech startup', 'Land a great job in my field', 'Switch careers', 'Get really good at a skill', 'Become financially independent', 'Find more balance'];
const DECISIONS = [
  'Spend 2 extra hours a day building projects',
  'Focus on starting a business alongside my studies/job',
  'Switch to a different career',
  'Move to another city',
  'Stop procrastinating and follow a consistent routine',
];

const LOADING_LINES = [
  'Mapping your current trajectory…',
  'Exploring a different choice…',
  'Weighing the trade-offs…',
  'Writing your possible futures…',
];

export default function Onboarding() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';
  const { user, profile } = useUser();
  const { refreshProfile } = useAuth();
  const { award } = useGame();

  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(profile?.stage ?? '');
  const [age, setAge] = useState(profile?.age_range ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [ambition, setAmbition] = useState(profile?.ambition ?? '');
  const [habits, setHabits] = useState(profile?.habits ?? '');
  const [hours, setHours] = useState(profile?.hours_available ?? 2);
  const [strengths, setStrengths] = useState(profile?.strengths ?? '');
  const [challenges, setChallenges] = useState(profile?.challenges ?? '');
  const [changeGoal, setChangeGoal] = useState(profile?.change_goal ?? '');
  const [decision, setDecision] = useState('');
  const [horizon, setHorizon] = useState(5);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const steps = isEdit ? 5 : 6;

  useEffect(() => {
    Animated.timing(progress, { toValue: (step + 1) / steps, duration: 300, useNativeDriver: false }).start();
  }, [step, steps, progress]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLineIdx((i) => (i + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(t);
  }, [busy]);

  const toggleInterest = (i: string) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  async function finish() {
    setError(null);
    setBusy(true);
    try {
      await updateProfile(user.id, {
        stage: stage || null,
        age_range: age || null,
        interests,
        ambition: ambition.trim() || null,
        habits: habits.trim() || null,
        hours_available: hours,
        strengths: strengths.trim() || null,
        challenges: challenges.trim() || null,
        change_goal: changeGoal.trim() || null,
      });

      if (isEdit) {
        await refreshProfile();
        router.back();
        return;
      }

      const { snapshotId } = await generateSnapshot({
        horizonYears: horizon,
        decision: decision.trim() || undefined,
      });
      await updateProfile(user.id, { onboarded: true });
      await refreshProfile();
      award('welcome', 'welcome');
      router.replace(`/reveal/${snapshotId}`);
    } catch (e) {
      if (e instanceof LimitError) {
        // Already used this month's allowance (e.g. after deleting data) — still let them in.
        await updateProfile(user.id, { onboarded: true });
        await refreshProfile();
        router.replace('/premium');
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (busy && !isEdit) {
    return (
      <Screen scroll={false}>
        <Loading label={LOADING_LINES[lineIdx]} />
        <Disclaimer />
      </Screen>
    );
  }

  const isLast = step === steps - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {step > 0 || isEdit ? (
            <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())} hitSlop={12}>
              <T color={colors.violetSoft}>Back</T>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: radius.pill }}>
            <Animated.View
              style={{
                height: 4,
                borderRadius: radius.pill,
                backgroundColor: colors.cyan,
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }}
            />
          </View>
          <T variant="small" color={colors.textFaint}>
            {step + 1}/{steps}
          </T>
        </View>

        {step === 0 && (
          <>
            <Label>Step 1 · Meet yourself</Label>
            <T variant="h1">Where are you in life right now?</T>
            <T color={colors.textMuted}>Skip anything you'd rather not answer.</T>
            <T variant="h3">Current stage</T>
            <ChipRow options={STAGES} value={stage} onChange={setStage} />
            <T variant="h3">Age range</T>
            <ChipRow options={AGES} value={age} onChange={setAge} />
          </>
        )}

        {step === 1 && (
          <>
            <Label>Step 2 · Ambition</Label>
            <T variant="h1">What do you most want from the next few years?</T>
            <Field value={ambition} onChangeText={setAmbition} placeholder="e.g. Build a successful technology startup" multiline />
            <ChipRow options={AMBITIONS} value={ambition} onChange={setAmbition} color={colors.cyan} />
          </>
        )}

        {step === 2 && (
          <>
            <Label>Step 3 · Interests</Label>
            <T variant="h1">What pulls your attention?</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {INTERESTS.map((i) => (
                <Chip key={i} label={i} selected={interests.includes(i)} onPress={() => toggleInterest(i)} />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Label>Step 4 · Habits & time</Label>
            <T variant="h1">How do your days usually go?</T>
            <Field
              label="Current habits"
              value={habits}
              onChangeText={setHabits}
              placeholder="e.g. 1 hour of programming most days, lots of coursework, scroll at night"
              multiline
            />
            <Card>
              <T variant="h3">Time you could put toward change</T>
              <T variant="h1" color={colors.cyan}>
                {hours.toFixed(1)} h / day
              </T>
              <Slider
                minimumValue={0}
                maximumValue={6}
                step={0.5}
                value={hours}
                onValueChange={setHours}
                minimumTrackTintColor={colors.cyan}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.cyan}
              />
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <Label>Step 5 · Strengths & challenges</Label>
            <T variant="h1">What helps you — and what gets in the way?</T>
            <Field label="Strengths" value={strengths} onChangeText={setStrengths} placeholder="e.g. Curious, quick learner, good with people" multiline />
            <Field label="Challenges" value={challenges} onChangeText={setChallenges} placeholder="e.g. Inconsistent discipline, overthinking" multiline />
            <Field label="What would you like to change?" value={changeGoal} onChangeText={setChangeGoal} placeholder="e.g. Finish projects instead of starting new ones" multiline />
          </>
        )}

        {step === 5 && !isEdit && (
          <>
            <Label>Step 6 · Your first what-if</Label>
            <T variant="h1">Which different choice do you want to explore?</T>
            <Field value={decision} onChangeText={setDecision} placeholder="What if I…" multiline />
            <ChipRow options={DECISIONS} value={decision} onChange={setDecision} color={colors.violet} />
            <T variant="h3">Look ahead</T>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[3, 5].map((y) => (
                <Chip key={y} label={`${y} years`} selected={horizon === y} onPress={() => setHorizon(y)} color={colors.cyan} />
              ))}
            </View>
            <Disclaimer />
          </>
        )}

        {error ? <ErrorBox message={error} /> : null}

        <Button
          title={isLast ? (isEdit ? 'Save profile' : 'Reveal my parallel lives') : 'Continue'}
          icon={isLast && !isEdit ? 'sparkles' : undefined}
          loading={busy}
          onPress={() => (isLast ? finish() : setStep(step + 1))}
        />
        {!isLast ? (
          <Button title="Skip" variant="ghost" onPress={() => setStep(step + 1)} />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  color,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => (
        <Chip key={o} label={o} selected={value === o} onPress={() => onChange(value === o ? '' : o)} color={color} />
      ))}
    </View>
  );
}
