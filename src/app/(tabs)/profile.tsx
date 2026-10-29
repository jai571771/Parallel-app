import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Label, Screen, T } from '@/components/ui';
import { deleteAllData, exportAllData, getUsage, updateProfile } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import { useLoad } from '@/lib/useLoad';
import { Pip } from '@/components/Pip';
import { BADGES, levelInfo, visibleStreak } from '@/lib/game';
import { REMINDER_OPTIONS, scheduleDailyReminder } from '@/lib/notifications';
import { useAuth, useUser } from '@/providers/AuthProvider';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';

export default function ProfileTab() {
  const { user, profile } = useUser();
  const { refreshProfile, signOut } = useAuth();
  const { data: usage } = useLoad(getUsage, [user.id]);
  const [busy, setBusy] = useState<string | null>(null);

  const plan = profile?.plan ?? 'free';
  const limits = LIMITS[plan];

  async function toggleMemory(value: boolean) {
    await updateProfile(user.id, { consent_memory: value });
    await refreshProfile();
  }

  async function exportData() {
    setBusy('export');
    try {
      const data = await exportAllData(user.id);
      const file = new File(Paths.cache, 'parallel-my-data.json');
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export my PARALLEL data' });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete all my data?',
      'This permanently deletes your profile answers, snapshots, plans and check-ins. Your login stays so you can start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await deleteAllData(user.id);
              await refreshProfile();
              router.replace('/onboarding');
            } catch (e) {
              Alert.alert('Delete failed', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  const facts: [string, string | null | undefined][] = [
    ['Stage', profile?.stage],
    ['Age range', profile?.age_range],
    ['Ambition', profile?.ambition],
    ['Interests', profile?.interests?.join(', ')],
    ['Habits', profile?.habits],
    ['Time available', profile?.hours_available != null ? `${profile.hours_available} h/day` : null],
    ['Strengths', profile?.strengths],
    ['Challenges', profile?.challenges],
    ['Want to change', profile?.change_goal],
  ];

  return (
    <Screen>
      <Label>Profile</Label>
      <T variant="h1">{profile?.display_name || 'You'}</T>
      <T color={colors.textMuted}>{user.email}</T>

      <GameStats />

      <ReminderCard />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T variant="h3">About you</T>
          <T color={colors.violetSoft} onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })}>
            Edit
          </T>
        </View>
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <View key={k} style={{ marginTop: spacing.xs }}>
            <T variant="small" color={colors.textFaint}>{k}</T>
            <T>{v}</T>
          </View>
        ))}
      </Card>

      <Card accent={plan === 'plus' ? colors.violet : undefined}>
        <Label color={colors.violetSoft}>Subscription</Label>
        <T variant="h3">{plan === 'plus' ? 'PARALLEL Plus' : 'PARALLEL Free'}</T>
        <T color={colors.textMuted}>
          {usage?.generations ?? 0} of {limits.generationsPerMonth} explorations used this month
        </T>
        {plan === 'free' ? <Button title="See Plus" variant="secondary" onPress={() => router.push('/premium')} /> : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Label>Privacy</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <T variant="h3">Scenario memory</T>
            <T variant="small" color={colors.textMuted}>
              Let PARALLEL remind you of paths you explored and use your progress when you revisit them.
            </T>
          </View>
          <Switch
            value={profile?.consent_memory ?? true}
            onValueChange={toggleMemory}
            trackColor={{ true: colors.violet, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <T variant="small" color={colors.textMuted}>
          Your scenarios are private by default and only leave the app when you share a card yourself.
        </T>
        <Button title="Export my data" icon="download-outline" variant="secondary" loading={busy === 'export'} onPress={exportData} />
        <Button title="Delete all my data" icon="trash-outline" variant="danger" loading={busy === 'delete'} onPress={confirmDelete} />
      </Card>

      <Card style={{ backgroundColor: colors.bgElevated }}>
        <T variant="small" color={colors.textFaint}>
          PARALLEL generates hypothetical, assumption-based scenarios. It is not a therapist, financial adviser or a
          scientifically validated forecasting tool. For health, money or mental-wellbeing decisions, please talk to
          a qualified professional.
        </T>
      </Card>

      <Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}

function GameStats() {
  const { game, badges } = useGame();
  const lvl = levelInfo(game?.xp ?? 0);
  const { streak } = visibleStreak(game);

  return (
    <Card accent={colors.violet} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pip size={64} mood="cheer" />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="h2">{lvl.emoji} {lvl.name}</T>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: radius.pill }}>
            <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: '#FFE66D', width: `${Math.round(lvl.progress * 100)}%` }} />
          </View>
          <T variant="small" color={colors.textMuted}>
            {lvl.next ? `${lvl.toNext} XP to ${lvl.next.name}` : 'Top level reached!'}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Stat value={`🔥 ${streak}`} label="Day streak" />
        <Stat value={`⚡ ${game?.xp ?? 0}`} label="Total XP" />
        <Stat value={`🏆 ${game?.longest_streak ?? 0}`} label="Best streak" />
        <Stat value={`🧊 ${game?.freezes ?? 0}`} label="Freezes" />
      </View>
      <T variant="small" color={colors.textFaint}>Every 7-day streak earns a streak freeze 🧊 (max 2). It saves your streak if you miss one day.</T>

      <T variant="h3">Badges</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {Object.entries(BADGES).map(([id, b]) => {
          const earned = badges.includes(id);
          return (
            <View
              key={id}
              style={{
                width: '30.5%',
                alignItems: 'center',
                padding: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: earned ? colors.cardAlt : colors.bgElevated,
                borderWidth: 1,
                borderColor: earned ? colors.violet : colors.border,
                opacity: earned ? 1 : 0.45,
              }}
            >
              <Text style={{ fontSize: 28 }}>{earned ? b.emoji : '🔒'}</Text>
              <T variant="small" style={{ textAlign: 'center', fontWeight: '700' }} numberOfLines={1}>{b.name}</T>
              <T variant="small" color={colors.textFaint} style={{ textAlign: 'center', fontSize: 11, lineHeight: 14 }} numberOfLines={2}>{b.how}</T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <T variant="h3">{value}</T>
      <T variant="small" color={colors.textFaint}>{label}</T>
    </View>
  );
}

function ReminderCard() {
  const { game, setReminder } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const current = game?.reminder_time ?? null;

  async function pick(time: string | null) {
    setNote(null);
    const ok = await scheduleDailyReminder(time);
    if (!ok) {
      setNote('Notifications are turned off for Expo Go. Turn them on in your phone settings to get reminders.');
      return;
    }
    await setReminder(time);
    setNote(time ? `Pip will remind you every day at ${time} 🔔` : 'Reminders turned off.');
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="h3">🔔 Daily reminder</T>
      <T variant="small" color={colors.textMuted}>Pip can nudge you once a day so you never lose your streak.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {REMINDER_OPTIONS.map((o) => (
          <Chip key={o.time} label={`${o.emoji} ${o.label} ${o.time}`} selected={current === o.time} color={colors.cyan} onPress={() => pick(o.time)} />
        ))}
        <Chip label="Off" selected={!current} onPress={() => pick(null)} />
      </View>
      {note ? <T variant="small" color={colors.cyan}>{note}</T> : null}
    </Card>
  );
}
