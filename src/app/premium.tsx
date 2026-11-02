import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { PipSays } from '@/components/Pip';
import { Button, Card, ErrorBox, Label, Screen, T } from '@/components/ui';
import {
  billingAvailable,
  billingUnavailableReason,
  buyPlus,
  getPlusPackage,
  manageSubscription,
  restorePurchases,
} from '@/lib/billing';
import { LIMITS, PLUS_PRICE_LABEL } from '@/lib/limits';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

const FEATURES = [
  { id: 'requirements', icon: '🧰', title: 'What each life takes', body: 'The skills, time and habits every path needs from you.' },
  { id: 'risks', icon: '🌧️', title: 'What could go wrong', body: 'See the bumps on the road before you reach them.' },
  { id: 'changes', icon: '🔄', title: 'Turning points', body: 'What could make each life better or harder.' },
  { id: 'paths', icon: '🌌', title: 'More parallel lives', body: `Up to ${LIMITS.plus.alternatesPerSnapshot} different choices in one snapshot, compared side by side.` },
  { id: 'stories', icon: '📖', title: 'A story for every life', body: 'Meet your future self in each possible path.' },
  { id: 'plans', icon: '🗺️', title: 'Bigger plans', body: 'Multiple plans with weekly quests and milestones.' },
] as const;

const TABLE: [string, string, string][] = [
  ['Lives per snapshot', `${LIMITS.free.alternatesPerSnapshot + 1}`, `${LIMITS.plus.alternatesPerSnapshot + 1}`],
  ['Saved snapshots', String(LIMITS.free.savedSnapshots), String(LIMITS.plus.savedSnapshots)],
  ['Big explorations / month', String(LIMITS.free.generationsPerMonth), `${LIMITS.plus.generationsPerMonth}`],
  ['Time views', LIMITS.free.horizons.join(', ') + ' yrs', LIMITS.plus.horizons.join(', ') + ' yrs'],
  ['Deep insights', '🔒', '✅'],
  ['Action plans', String(LIMITS.free.activePlans), String(LIMITS.plus.activePlans)],
];

/** PARALLEL Plus paywall — Google Play Billing via RevenueCat. */
export default function Premium() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { profile, refreshProfile } = useAuth();
  const isPlus = profile?.plan === 'plus';

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    if (!billingAvailable || isPlus) return;
    getPlusPackage()
      .then(setPkg)
      .catch(() => setError("Couldn't load the price from Google Play. Check your connection."));
  }, [isPlus]);

  async function subscribe() {
    if (!pkg) return;
    setError(null);
    setBusy('buy');
    try {
      const bought = await buyPlus(pkg);
      if (bought) {
        await refreshProfile();
        setJustUnlocked(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setError(null);
    setBusy('restore');
    try {
      const r = await restorePurchases();
      await refreshProfile();
      if (r.plan === 'plus') setJustUnlocked(true);
      else setError('No active Plus subscription found for this account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const price = pkg?.product.priceString ?? PLUS_PRICE_LABEL.split(' ')[0];
  const renews = profile?.plus_until ? new Date(profile.plus_until).toLocaleDateString() : null;

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-end' }}>
        <Ionicons name="close" size={26} color={colors.textMuted} />
      </Pressable>

      {isPlus ? (
        <>
          <PipSays mood="cheer" text={justUnlocked ? 'Woohoo! Plus is unlocked. Every insight is yours now! 🎉' : "You're a Plus explorer! Thanks for supporting PARALLEL 💜"} />
          <Card accent={colors.violet} style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 48 }}>🌟</Text>
            <T variant="h2">PARALLEL Plus is active</T>
            {renews ? <T color={colors.textMuted}>Renews or ends on {renews}</T> : null}
          </Card>
          {justUnlocked ? <Button title="Explore my lives" icon="sparkles" onPress={() => router.back()} /> : null}
          <Button title="Manage in Google Play" icon="settings-outline" variant="secondary" onPress={manageSubscription} />
          <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
            Cancel or change your plan anytime in Google Play. You keep Plus until the end of the period you paid for.
          </T>
        </>
      ) : (
        <>
          <PipSays mood="wow" text="Unlock your full future! See what every life takes, what could go wrong, and what could change it." />
          <Label color={colors.violetSoft}>PARALLEL Plus</Label>
          <T variant="h1">See the whole picture before you choose.</T>

          <View style={{ gap: spacing.sm }}>
            {FEATURES.map((f) => {
              const highlight = f.id === feature;
              return (
                <View
                  key={f.id}
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    alignItems: 'center',
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: highlight ? 1.5 : 1,
                    borderColor: highlight ? '#FFE66D' : colors.border,
                    backgroundColor: highlight ? '#FFE66D14' : colors.card,
                  }}
                >
                  <Text style={{ fontSize: 30 }}>{f.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <T variant="h3">{f.title}</T>
                    <T variant="small" color={colors.textMuted}>{f.body}</T>
                  </View>
                  {highlight ? <T variant="label" color="#FFE66D">You tapped</T> : null}
                </View>
              );
            })}
          </View>

          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row' }}>
              <T variant="small" style={{ flex: 1.4 }}> </T>
              <T variant="label" color={colors.textMuted} style={{ flex: 1 }}>Free</T>
              <T variant="label" color={colors.violetSoft} style={{ flex: 1 }}>Plus</T>
            </View>
            {TABLE.map(([name, free, plus]) => (
              <View key={name} style={{ flexDirection: 'row' }}>
                <T variant="small" style={{ flex: 1.4 }}>{name}</T>
                <T variant="small" color={colors.textMuted} style={{ flex: 1 }}>{free}</T>
                <T variant="small" style={{ flex: 1, fontWeight: '700' }}>{plus}</T>
              </View>
            ))}
          </Card>

          <Card accent={colors.violet} style={{ alignItems: 'center', gap: spacing.xs }}>
            <T variant="h1">{price}<T color={colors.textMuted}> / month</T></T>
            <T variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>
              Billed monthly through Google Play. Auto-renews until you cancel. Cancel anytime in Google Play.
            </T>
          </Card>

          {error ? <ErrorBox message={error} /> : null}

          {billingAvailable ? (
            <>
              <Button title={`Get Plus · ${price}/month`} icon="star" loading={busy === 'buy'} disabled={!pkg || !!busy} onPress={subscribe} />
              <Button title="Restore purchases" variant="ghost" loading={busy === 'restore'} disabled={!!busy} onPress={restore} />
            </>
          ) : (
            <Card style={{ backgroundColor: colors.bgElevated }}>
              <T color={colors.textMuted} style={{ textAlign: 'center' }}>🛠️ {billingUnavailableReason}</T>
            </Card>
          )}

          <Button title="Keep exploring for free" variant="ghost" onPress={() => router.back()} />
          <T variant="small" color={colors.textFaint} style={{ textAlign: 'center' }}>
            Plus gives you more depth, not a “more accurate” future. All scenarios are possibilities, not predictions.
          </T>
        </>
      )}
    </Screen>
  );
}
