import { router } from 'expo-router';
import { View } from 'react-native';
import { LifeMap } from '@/components/LifeMap';
import { Button, Disclaimer, Label, Screen, T } from '@/components/ui';
import { colors, pathColors, spacing } from '@/theme';

/** Landing screen — the hook from the concept doc. */
export default function Welcome() {
  return (
    <Screen scroll={false} edges={['top', 'bottom']} contentStyle={{ justifyContent: 'space-between' }}>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Label>PARALLEL</Label>
        <T variant="h1" style={{ fontSize: 36, lineHeight: 42 }}>
          Meet the life you didn't choose.
        </T>
        <T color={colors.textMuted}>
          Explore other versions of your future, see the trade-offs behind each choice, and turn the path you
          prefer into a practical plan.
        </T>
      </View>

      <LifeMap branches={pathColors.slice(0, 3).map((color) => ({ color }))} height={240} />

      <View style={{ gap: spacing.md }}>
        <T variant="h3" style={{ textAlign: 'center' }}>
          What would your life look like in five years if you changed just one thing?
        </T>
        <Button title="Start exploring — it's free" icon="sparkles" onPress={() => router.push('/sign-up')} />
        <Button title="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
        <Disclaimer text="PARALLEL creates assumption-based scenarios to help you think. It does not predict your future." />
      </View>
    </Screen>
  );
}
