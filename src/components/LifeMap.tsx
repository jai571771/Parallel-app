import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors, pathColors } from '@/theme';

type Branch = { color?: string };

/**
 * The branching "life map": every path starts at a shared "now" node and fans out.
 * Pure SVG so it works in Expo Go with no native extras.
 */
export function LifeMap({
  branches,
  height = 200,
  animate = true,
}: {
  branches: Branch[];
  height?: number;
  animate?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const scale = useRef(new Animated.Value(animate ? 0.92 : 1)).current;

  useEffect(() => {
    if (!animate || width === 0) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [animate, width, opacity, scale]);

  const n = Math.max(branches.length, 1);
  const pad = 28;
  const origin = { x: width / 2, y: height - 18 };

  const ends = branches.map((_, i) => {
    const x = n === 1 ? width / 2 : pad + ((width - pad * 2) * i) / (n - 1);
    // Outer branches end slightly lower for a fan shape.
    const centerDist = n === 1 ? 0 : Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    return { x, y: pad + centerDist * 12 };
  });

  const curve = (end: { x: number; y: number }) => {
    const c1 = { x: origin.x, y: origin.y - height * 0.35 };
    const c2 = { x: end.x, y: end.y + height * 0.35 };
    return { d: `M ${origin.x} ${origin.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`, c1, c2 };
  };

  // Point on a cubic bezier, used to place milestone dots along each branch.
  const at = (t: number, p0: number, p1: number, p2: number, p3: number) =>
    (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="100%" r="60%">
                <Stop offset="0" stopColor={colors.violet} stopOpacity="0.25" />
                <Stop offset="1" stopColor={colors.violet} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Path d={`M0 0 H${width} V${height} H0 Z`} fill="url(#glow)" />
            {ends.map((end, i) => {
              const color = branches[i].color ?? pathColors[i % pathColors.length];
              const { d, c1, c2 } = curve(end);
              const dots = [0.33, 0.66, 1].map((t) => ({
                x: at(t, origin.x, c1.x, c2.x, end.x),
                y: at(t, origin.y, c1.y, c2.y, end.y),
              }));
              return (
                <G key={i}>
                  <Path d={d} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
                  {dots.map((p, j) => (
                    <Circle key={j} cx={p.x} cy={p.y} r={j === 2 ? 8 : 6} fill={color} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </G>
              );
            })}
            <Circle cx={origin.x} cy={origin.y} r={8} fill="#fff" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
