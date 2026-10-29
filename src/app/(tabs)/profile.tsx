import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Button, Card, Label, Screen, T } from '@/components/ui';
import { deleteAllData, exportAllData, getUsage, updateProfile } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import { useLoad } from '@/lib/useLoad';
import { useAuth, useUser } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

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
