import { BlurTargetView, BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';
import { Button, T } from './ui';

export type PlusFeature = 'requirements' | 'risks' | 'changes';

/**
 * Shows a real-but-blurred peek of a Plus feature to free users, with an unlock
 * button. Plus users just see the content.
 */
export function PlusLock({
  feature,
  icon,
  title,
  teaser,
  children,
  compact,
}: {
  feature: PlusFeature;
  icon: string;
  title: string;
  teaser: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const { profile } = useAuth();
  const target = useRef<ComponentRef<typeof View> | null>(null);

  if (profile?.plan === 'plus') return <>{children}</>;

  return (
    <View style={styles.wrap}>
      <BlurTargetView ref={target} style={[styles.peek, { height: compact ? 90 : 120 }]}>
        <View pointerEvents="none">{children}</View>
      </BlurTargetView>
      <BlurView blurTarget={target} blurMethod="dimezisBlurView" intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <T variant="label" color="#FFE66D">🔒 PLUS</T>
        </View>
        <T variant="h3" style={{ textAlign: 'center' }}>{icon ? `${icon} ` : ''}{title}</T>
        {!compact ? <T variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>{teaser}</T> : null}
        <Button
          title="Unlock with Plus"
          icon="lock-open-outline"
          onPress={() => router.push({ pathname: '/premium', params: { feature } })}
          style={{ alignSelf: 'stretch', marginTop: spacing.xs }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FFE66D55',
    overflow: 'hidden',
    backgroundColor: colors.card,
    minHeight: 190,
  },
  peek: { padding: spacing.lg, overflow: 'hidden' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: '#FFE66D22',
    borderColor: '#FFE66D88',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
});
