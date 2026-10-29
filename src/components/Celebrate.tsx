import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { BADGES, LEVELS } from '@/lib/game';
import { colors, radius, spacing } from '@/theme';
import { Pip } from './Pip';
import { Button, T } from './ui';

export type Celebration = CelebrationEvent & { id: number };

export type CelebrationEvent =
  | { kind: 'xp'; amount: number }
  | { kind: 'streak'; streak: number; freezeUsed: boolean }
  | { kind: 'goal' }
  | { kind: 'level'; level: number }
  | { kind: 'badge'; badge: string };

/**
 * Global reward overlay. Small XP gains are a quick toast; streaks, goals,
 * level-ups and badges get a full-screen moment with confetti.
 */
export function Celebrate({ event, onDone }: { event: Celebration | null; onDone: () => void }) {
  // Keep the latest callback without restarting animations when the parent re-renders.
  const done = useRef(onDone);
  done.current = onDone;
  const finish = useCallback(() => done.current(), []);
  if (!event) return null;
  if (event.kind === 'xp') return <XpToast key={event.id} amount={event.amount} onDone={finish} />;
  return <BigMoment key={event.id} event={event} onDone={finish} />;
}

function XpToast({ amount, onDone }: { amount: number; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(anim, { toValue: 2, duration: 300, useNativeDriver: true }),
    ]).start(onDone);
  }, [anim, onDone]);

  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [20, 0, -30] }) },
              { scale: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1] }) },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: 22 }}>⚡</Text>
        <T variant="h3" color="#FFE66D">+{amount} XP</T>
      </Animated.View>
    </View>
  );
}

function BigMoment({ event, onDone }: { event: Exclude<CelebrationEvent, { kind: 'xp' }>; onDone: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(pop, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [pop]);

  let big = '';
  let title = '';
  let body = '';
  switch (event.kind) {
    case 'streak':
      big = '🔥';
      title = event.streak === 1 ? 'Streak started!' : `${event.streak}-day streak!`;
      body = event.freezeUsed
        ? 'A streak freeze 🧊 saved your streak. Phew!'
        : event.streak === 1
          ? 'Come back tomorrow to keep the flame alive.'
          : 'You keep showing up for your future. Amazing!';
      break;
    case 'goal':
      big = '🎯';
      title = 'Daily goal reached!';
      body = "You did your bit for future-you today.";
      break;
    case 'level': {
      const l = LEVELS[event.level];
      big = l?.emoji ?? '🌟';
      title = `You're now a ${l?.name ?? 'new level'}!`;
      body = 'Every small step adds up. Keep exploring!';
      break;
    }
    case 'badge': {
      const b = BADGES[event.badge];
      big = b?.emoji ?? '🏅';
      title = `Badge unlocked: ${b?.name ?? event.badge}`;
      body = b?.how ?? '';
      break;
    }
  }

  return (
    <View style={styles.overlay}>
      <Confetti />
      <Animated.View style={[styles.card, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }], opacity: pop }]}>
        <Pip size={84} mood="cheer" />
        <Text style={{ fontSize: 64 }}>{big}</Text>
        <T variant="h1" style={{ textAlign: 'center' }}>{title}</T>
        <T color={colors.textMuted} style={{ textAlign: 'center' }}>{body}</T>
        <Button title="Continue" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
      </Animated.View>
    </View>
  );
}

const CONFETTI_COLORS = [colors.cyan, colors.violet, colors.orange, '#FFE66D', '#FF6B81', colors.success];

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: Math.random() * width,
        delay: Math.random() * 400,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        anim: new Animated.Value(0),
      })),
    [width],
  );

  useEffect(() => {
    Animated.stagger(
      30,
      pieces.map((p) =>
        Animated.timing(p.anim, { toValue: 1, duration: 2200, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 1.6,
            borderRadius: 2,
            backgroundColor: p.color,
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: [`${p.rotate}deg`, `${p.rotate + 540}deg`] }) },
            ],
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderColor: '#FFE66D',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderColor: colors.violet,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
