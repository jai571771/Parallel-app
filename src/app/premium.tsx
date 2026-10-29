import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Label, Screen, T } from '@/components/ui';
import { LIMITS, PLUS_PRICE_LABEL } from '@/lib/limits';
import { colors, spacing } from '@/theme';

const FEATURES: [string, string, string][] = [
  ['Parallel paths per snapshot', `${LIMITS.free.alternatesPerSnapshot} alternate`, `${LIMITS.plus.alternatesPerSnapshot} alternates`],
  ['Saved snapshots', String(LIMITS.free.savedSnapshots), String(LIMITS.plus.savedSnapshots)],
  ['AI generations / month', String(LIMITS.free.generationsPerMonth), `${LIMITS.plus.generationsPerMonth} (fair use)`],
  ['Time horizons', LIMITS.free.horizons.join(', ') + ' yrs', LIMITS.plus.horizons.join(', ') + ' yrs'],
  ['Comparison', 'Basic', 'Detailed: risks + life areas'],
  ['Future-self stories', '1 per snapshot', 'One per path'],
  ['Action plans', String(LIMITS.free.activePlans), 'Multiple, with milestones'],
  ['Share-card themes', 'Classic', 'All themes'],
];

/**
 * Upgrade screen. Payments aren't wired up yet (Razorpay is a later phase), so we
 * show honest pricing and a "coming soon" state rather than a fake checkout.
 */
export default function Premium() {
  const [notified, setNotified] = useState(false);

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-end' }}>
        <Ionicons name="close" size={26} color={colors.textMuted} />
      </Pressable>
      <Label color={colors.violetSoft}>PARALLEL Plus</Label>
      <T variant="h1">Explore more of your possible lives.</T>
      <T color={colors.textMuted}>
        Plus gives you more depth, control and continuity. It doesn't give you a "more accurate" future — no plan
        can do that.
      </T>

      <Card accent={colors.violet} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          <T variant="small" color={colors.textFaint} style={{ flex: 1.3 }}> </T>
          <T variant="label" color={colors.textMuted} style={{ flex: 1 }}>Free</T>
          <T variant="label" color={colors.violetSoft} style={{ flex: 1 }}>Plus</T>
        </View>
        {FEATURES.map(([name, free, plus]) => (
          <View key={name} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <T variant="small" style={{ flex: 1.3 }}>{name}</T>
            <T variant="small" color={colors.textMuted} style={{ flex: 1 }}>{free}</T>
            <T variant="small" color={colors.text} style={{ flex: 1 }}>{plus}</T>
          </View>
        ))}
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <T variant="h1">{PLUS_PRICE_LABEL}</T>
        <T variant="small" color={colors.textMuted}>Billed monthly · cancel anytime</T>
      </Card>

      {notified ? (
        <Card accent={colors.cyan}>
          <T>Thanks! Subscriptions are launching soon — we'll let you know in the app.</T>
        </Card>
      ) : (
        <Button title="Notify me when Plus launches" icon="notifications-outline" onPress={() => setNotified(true)} />
      )}
      <Button title="Keep exploring for free" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
