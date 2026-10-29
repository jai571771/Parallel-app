import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Button, Card, ErrorBox, Field, Label, Loading, Screen, T } from '@/components/ui';
import { addCheckin, addTask, deletePlan, listCheckins, listPlans, setTaskDone } from '@/lib/data';
import type { ActionPlan, PlanTask } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { useUser } from '@/providers/AuthProvider';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';

/** Path to Reality: tasks, milestones, check-ins. */
export default function PlanTab() {
  const { user } = useUser();
  const { award } = useGame();
  const { data, error, reload, setData } = useLoad(async () => {
    const [plans, checkins] = await Promise.all([listPlans(), listCheckins(5)]);
    return { plans, checkins };
  }, [user.id]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (error) return <Screen><ErrorBox message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen scroll={false}><Loading /></Screen>;

  const { plans, checkins } = data;
  const active = plans[0];

  async function toggle(plan: ActionPlan, task: PlanTask) {
    // Optimistic update so ticking feels instant.
    const next = !task.done;
    setData((d) =>
      d && {
        ...d,
        plans: d.plans.map((p) =>
          p.id !== plan.id ? p : { ...p, plan_tasks: p.plan_tasks?.map((t) => (t.id === task.id ? { ...t, done: next } : t)) },
        ),
      },
    );
    try {
      await setTaskDone(task, next);
      if (next) award(task.is_milestone ? 'milestone' : 'task_done', task.id);
    } catch {
      reload();
    }
  }

  async function saveCheckin() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const checkinId = await addCheckin(user.id, note.trim(), active?.id ?? null);
      award('checkin', checkinId);
      setNote('');
      reload();
    } finally {
      setSaving(false);
    }
  }

  if (!active) {
    return (
      <Screen>
        <Label color={colors.orange}>Plan</Label>
        <T variant="h1">Turn a possibility into action.</T>
        <Card>
          <T color={colors.textMuted}>
            Open any path you've explored and tap "Build this future" to get practical next steps, milestones and a
            review date.
          </T>
          <Button title="Go to my lives" onPress={() => router.navigate('/lives')} />
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Label color={colors.orange}>Path to reality</Label>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onToggle={(t) => toggle(plan, t)}
            onAddTask={async (title, week) => {
              await addTask(user.id, plan.id, title, week);
              reload();
            }}
            onDelete={() =>
              Alert.alert('Delete this plan?', 'Its tasks will be removed.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deletePlan(plan.id); reload(); } },
              ])
            }
          />
        ))}

        <Card style={{ gap: spacing.md }}>
          <T variant="h3">Check in</T>
          <T variant="small" color={colors.textMuted}>
            How's it going? Your check-ins help PARALLEL revisit your paths with your real progress.
          </T>
          <Field value={note} onChangeText={setNote} placeholder="e.g. Finished my first project this week" multiline />
          <Button title="Save check-in" variant="secondary" loading={saving} disabled={!note.trim()} onPress={saveCheckin} />
          {checkins.map((c) => (
            <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <T variant="small" color={colors.textFaint}>{new Date(c.created_at).toLocaleDateString()}</T>
              <T>{c.note}</T>
            </View>
          ))}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PlanCard({
  plan,
  onToggle,
  onAddTask,
  onDelete,
}: {
  plan: ActionPlan;
  onToggle: (t: PlanTask) => void;
  onAddTask: (title: string, week: number) => Promise<void>;
  onDelete: () => void;
}) {
  const [newTask, setNewTask] = useState('');
  const tasks = plan.plan_tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  const weeks = [...new Set(tasks.map((t) => t.week))].sort((a, b) => a - b);

  return (
    <Card accent={colors.orange} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <T variant="h2" style={{ flex: 1 }}>{plan.title}</T>
        <Pressable onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
        </Pressable>
      </View>
      {plan.summary ? <T color={colors.textMuted}>{plan.summary}</T> : null}
      {plan.scenarios ? (
        <T variant="small" color={colors.violetSoft} onPress={() => router.push(`/scenario/${plan.scenarios!.id}`)}>
          From: {plan.scenarios.title} →
        </T>
      ) : null}

      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: radius.pill }}>
        <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.orange, width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
      </View>
      <T variant="small" color={colors.textMuted}>
        {done}/{tasks.length} done{plan.review_date ? ` · review on ${new Date(plan.review_date).toLocaleDateString()}` : ''}
      </T>

      {weeks.map((w) => (
        <View key={w} style={{ gap: spacing.sm }}>
          <Label color={colors.textFaint}>Week {w}</Label>
          {tasks.filter((t) => t.week === w).map((t) => (
            <Pressable key={t.id} onPress={() => onToggle(t)} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
              <Ionicons
                name={t.done ? 'checkmark-circle' : t.is_milestone ? 'flag-outline' : 'ellipse-outline'}
                size={22}
                color={t.done ? colors.success : t.is_milestone ? colors.orange : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <T style={{ textDecorationLine: t.done ? 'line-through' : 'none' }} color={t.done ? colors.textFaint : colors.text}>
                  {t.title}
                </T>
                {t.detail ? <T variant="small" color={colors.textFaint}>{t.detail}</T> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Field value={newTask} onChangeText={setNewTask} placeholder="Add your own step" />
        </View>
        <Pressable
          onPress={async () => {
            if (!newTask.trim()) return;
            await onAddTask(newTask.trim(), weeks[weeks.length - 1] ?? 1);
            setNewTask('');
          }}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={36} color={colors.orange} />
        </Pressable>
      </View>
    </Card>
  );
}
