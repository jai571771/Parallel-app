import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { LifeMap } from '@/components/LifeMap';
import { scenarioColor } from '@/components/ScenarioCard';
import { Button, Card, ErrorBox, Label, Loading, Screen, T } from '@/components/ui';
import { deleteSnapshot, listSnapshots } from '@/lib/data';
import { LIMITS } from '@/lib/limits';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

/** My Lives + My Life Archive: every saved snapshot with its branching map. */
export default function Lives() {
  const { profile } = useUser();
  const { data: snapshots, error, reload } = useLoad(listSnapshots);
  const limits = LIMITS[profile?.plan ?? 'free'];

  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!snapshots) return <Screen scroll={false}><Loading /></Screen>;

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete snapshot?', `"${title}" and its paths will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSnapshot(id);
          reload();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Label>My Lives</Label>
      <T variant="h1">Your life map</T>
      <T color={colors.textMuted}>
        Every snapshot branches from where you were at the time. Revisit what you explored and how your priorities
        have shifted.
      </T>
      <T variant="small" color={colors.textFaint}>
        {snapshots.length}/{limits.savedSnapshots} saved snapshots
      </T>

      {snapshots.length === 0 ? (
        <Card>
          <T>No saved lives yet.</T>
          <Button title="Explore a what-if" onPress={() => router.navigate('/lab')} />
        </Card>
      ) : null}

      {snapshots.map((snap) => {
        const scenarios = snap.scenarios ?? [];
        return (
          <Card key={snap.id} onPress={() => router.push(`/reveal/${snap.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T variant="small" color={colors.textFaint}>
                {new Date(snap.created_at).toLocaleDateString()} · {snap.horizon_years}-year view
              </T>
              <Pressable hitSlop={12} onPress={() => confirmDelete(snap.id, snap.title)}>
                <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
            <T variant="h3">{snap.title}</T>
            <LifeMap branches={scenarios.map((s) => ({ color: scenarioColor(s) }))} height={100} animate={false} />
            <View style={{ gap: spacing.xs }}>
              {scenarios.map((s) => (
                <Pressable key={s.id} onPress={() => router.push(`/scenario/${s.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: scenarioColor(s) }} />
                  <T style={{ flex: 1 }}>{s.emoji ? `${s.emoji} ` : ''}{s.title}</T>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </Card>
        );
      })}

      <Button title="New snapshot or what-if" icon="add" variant="secondary" onPress={() => router.navigate('/lab')} />
    </Screen>
  );
}
