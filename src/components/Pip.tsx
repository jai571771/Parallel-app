import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors, radius, spacing } from '@/theme';
import { T } from './ui';

export type PipMood = 'happy' | 'thinking' | 'cheer' | 'sleepy' | 'wow';

/** Pip — PARALLEL's firefly guide, who "lights up the paths ahead". */
export function Pip({ size = 72, mood = 'happy' }: { size?: number; mood?: PipMood }) {
  const bob = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: mood === 'sleepy' ? 2200 : 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: mood === 'sleepy' ? 2200 : 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    bobLoop.start();
    glowLoop.start();
    return () => {
      bobLoop.stop();
      glowLoop.stop();
    };
  }, [bob, glow, mood]);

  const lift = mood === 'cheer' ? -10 : -5;
  const glowColor = mood === 'sleepy' ? '#8A8FB8' : '#FFE66D';

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) }],
      }}
    >
      {/* Soft pulsing glow behind the tail */}
      <Animated.View
        style={{
          position: 'absolute',
          left: size * 0.14,
          top: size * 0.46,
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: size,
          backgroundColor: glowColor,
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: mood === 'sleepy' ? [0.08, 0.15] : [0.2, 0.45] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
        }}
      />
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="tail" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFBE0" />
            <Stop offset="0.6" stopColor={mood === 'sleepy' ? '#C9CCE6' : '#FFE66D'} />
            <Stop offset="1" stopColor={mood === 'sleepy' ? '#8A8FB8' : '#FFB800'} />
          </RadialGradient>
        </Defs>
        {/* Wings */}
        <Ellipse cx="44" cy="30" rx="16" ry="11" fill="#CFE9FF" opacity="0.55" transform="rotate(-25 44 30)" />
        <Ellipse cx="64" cy="28" rx="16" ry="11" fill="#CFE9FF" opacity="0.55" transform="rotate(20 64 28)" />
        {/* Glowing tail */}
        <Circle cx="38" cy="70" r="17" fill="url(#tail)" />
        {/* Body */}
        <Ellipse cx="52" cy="57" rx="17" ry="15" fill="#3B2F7A" />
        <Path d="M40 60 Q52 66 64 60" stroke="#5B4BB0" strokeWidth="3" fill="none" />
        {/* Head */}
        <Circle cx="62" cy="40" r="19" fill={colors.violet} />
        {/* Antennae */}
        <Path d="M56 23 Q50 10 44 9" stroke={colors.violet} strokeWidth="3" fill="none" strokeLinecap="round" />
        <Path d="M68 23 Q74 10 81 10" stroke={colors.violet} strokeWidth="3" fill="none" strokeLinecap="round" />
        <Circle cx="44" cy="9" r="3.5" fill="#FFE66D" />
        <Circle cx="81" cy="10" r="3.5" fill="#FFE66D" />
        <Face mood={mood} />
        {/* Cheeks */}
        <Circle cx="51" cy="46" r="3" fill="#FF8FB1" opacity="0.6" />
        <Circle cx="74" cy="46" r="3" fill="#FF8FB1" opacity="0.6" />
      </Svg>
    </Animated.View>
  );
}

function Face({ mood }: { mood: PipMood }) {
  switch (mood) {
    case 'sleepy':
      return (
        <G>
          <Path d="M52 39 Q56 42 60 39" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Path d="M65 39 Q69 42 73 39" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Ellipse cx="62" cy="49" rx="3" ry="2" fill="#1B1340" />
        </G>
      );
    case 'cheer':
      return (
        <G>
          <Path d="M52 40 Q56 34 60 40" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M65 40 Q69 34 73 40" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d="M55 46 Q62 55 70 46 Z" fill="#1B1340" />
        </G>
      );
    case 'wow':
      return (
        <G>
          <Circle cx="56" cy="38" r="5.5" fill="#fff" />
          <Circle cx="69" cy="38" r="5.5" fill="#fff" />
          <Circle cx="56" cy="38" r="3" fill="#1B1340" />
          <Circle cx="69" cy="38" r="3" fill="#1B1340" />
          <Circle cx="62.5" cy="50" r="3.5" fill="#1B1340" />
        </G>
      );
    case 'thinking':
      return (
        <G>
          <Circle cx="56" cy="38" r="4.5" fill="#fff" />
          <Circle cx="69" cy="38" r="4.5" fill="#fff" />
          <Circle cx="57.5" cy="36" r="2.4" fill="#1B1340" />
          <Circle cx="70.5" cy="36" r="2.4" fill="#1B1340" />
          <Path d="M58 49 L67 48" stroke="#1B1340" strokeWidth="2.5" strokeLinecap="round" />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx="56" cy="38" r="4.5" fill="#fff" />
          <Circle cx="69" cy="38" r="4.5" fill="#fff" />
          <Circle cx="56.5" cy="38.5" r="2.4" fill="#1B1340" />
          <Circle cx="69.5" cy="38.5" r="2.4" fill="#1B1340" />
          <Path d="M56 46 Q62 52 69 46" stroke="#1B1340" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </G>
      );
  }
}

/** Pip with a speech bubble. */
export function PipSays({ text, mood = 'happy', size = 64 }: { text: string; mood?: PipMood; size?: number }) {
  return (
    <View style={styles.row}>
      <Pip size={size} mood={mood} />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <T style={{ fontSize: 15, lineHeight: 21 }}>{text}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bubble: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  tail: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.cardAlt,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
