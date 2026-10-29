import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { levelInfo, visibleStreak } from '@/lib/game';
import { useGame } from '@/providers/GameProvider';
import { colors, radius, spacing } from '@/theme';
import { T } from './ui';

/** Duolingo-style status bar: streak flame, XP, level and today's goal ring. */
export function GameBar() {
  const { game, todayXp } = useGame();
  const { streak, doneToday } = visibleStreak(game);
  const lvl = levelInfo(game?.xp ?? 0);
  const goal = game?.daily_goal ?? 30;

  return (
    <Pressable onPress={() => router.navigate('/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Stat icon="🔥" value={String(streak)} dim={!doneToday} color={colors.orange} />
      <Stat icon="⚡" value={String(game?.xp ?? 0)} color="#FFE66D" />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 }}>
          <Text style={{ fontSize: 14 }}>{lvl.emoji}</Text>
          <T variant="small" style={{ fontWeight: '700' }}>{lvl.name}</T>
        </View>
      </View>
      <GoalRing value={todayXp} goal={goal} />
    </Pressable>
  );
}

function Stat({ icon, value, color, dim }: { icon: string; value: string; color: string; dim?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, opacity: dim ? 0.55 : 1 }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <T style={{ fontWeight: '800', fontSize: 16 }} color={color}>{value}</T>
    </View>
  );
}

export function GoalRing({ value, goal, size = 40 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const p = Math.min(value / goal, 1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={4} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={p >= 1 ? colors.success : colors.cyan}
          strokeWidth={4}
          fill="none"
          strokeDasharray={`${c * p} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: p >= 1 ? 16 : 10, color: colors.text, fontWeight: '700' }}>{p >= 1 ? '✓' : `${value}`}</Text>
    </View>
  );
}
