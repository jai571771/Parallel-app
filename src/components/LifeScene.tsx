import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { sceneKey, type SceneKey } from '@/lib/visual';
import { colors, radius } from '@/theme';

/**
 * A small flat illustration of a possible life. Ten scenes, each tinted with the
 * path's colour, with the life's emoji floating above it. Pure SVG + Animated.
 */
export function LifeScene({
  scene,
  color = colors.violet,
  emoji,
  height = 150,
  animate = true,
  rounded = true,
}: {
  scene: string | null | undefined;
  color?: string;
  emoji?: string | null;
  height?: number;
  animate?: boolean;
  rounded?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const float = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const key = sceneKey(scene);

  useEffect(() => {
    if (!animate) return;
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(twinkle, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(twinkle, { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animate, float, twinkle]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: rounded ? radius.md : 0, overflow: 'hidden', backgroundColor: colors.bgElevated }}
    >
      {width > 0 ? (
        <Svg width={width} height={height} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.55" />
              <Stop offset="1" stopColor="#0B1020" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="320" height="180" fill="url(#sky)" />
          <Stars />
          <SceneArt k={key} c={color} />
        </Svg>
      ) : null}
      {animate && width > 0 ? (
        <>
          {[
            [0.12, 0.12],
            [0.82, 0.18],
            [0.55, 0.08],
          ].map(([x, y], i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: width * x,
                top: height * y,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#fff',
                opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.9, 0.2] : [0.2, 0.9] }),
              }}
            />
          ))}
        </>
      ) : null}
      {emoji ? (
        <Animated.View
          style={{
            position: 'absolute',
            right: 12,
            top: 10,
            transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
          }}
        >
          <Text style={{ fontSize: Math.max(22, height * 0.2) }}>{emoji}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Stars() {
  return (
    <G fill="#fff" opacity="0.5">
      <Circle cx="20" cy="20" r="1.2" />
      <Circle cx="70" cy="40" r="1" />
      <Circle cx="140" cy="16" r="1.4" />
      <Circle cx="210" cy="34" r="1" />
      <Circle cx="290" cy="50" r="1.2" />
      <Circle cx="250" cy="12" r="1" />
    </G>
  );
}

/** "You" — a tiny friendly figure in the path colour. */
function Person({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Circle cx="0" cy="-30" r="8" fill="#FFD8B5" />
      <Path d="M-8 -34 Q0 -44 8 -34 L8 -32 L-8 -32 Z" fill="#3B2F2F" />
      <Rect x="-10" y="-21" width="20" height="22" rx="8" fill={c} />
      <Rect x="-8" y="0" width="6" height="12" rx="3" fill="#2A3366" />
      <Rect x="2" y="0" width="6" height="12" rx="3" fill="#2A3366" />
    </G>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x="-3" y="-12" width="6" height="14" fill="#7A4E2D" />
      <Circle cx="0" cy="-22" r="14" fill="#2F9E6E" />
      <Circle cx="-8" cy="-16" r="9" fill="#38B47E" />
    </G>
  );
}

function Building({ x, w, h, c }: { x: number; w: number; h: number; c: string }) {
  const windows = [];
  for (let wy = 150 - h + 8; wy < 140; wy += 12) {
    for (let wx = x + 5; wx < x + w - 6; wx += 10) {
      windows.push(<Rect key={`${wx}-${wy}`} x={wx} y={wy} width="5" height="6" fill={(wx + wy) % 3 ? '#FFE66D' : '#2A3366'} opacity="0.85" />);
    }
  }
  return (
    <G>
      <Rect x={x} y={150 - h} width={w} height={h} fill={c} opacity="0.9" />
      {windows}
    </G>
  );
}

const Ground = ({ fill = '#1C2447' }: { fill?: string }) => <Rect x="0" y="148" width="320" height="32" fill={fill} />;

function SceneArt({ k, c }: { k: SceneKey; c: string }) {
  switch (k) {
    case 'study':
      return (
        <G>
          <Ground />
          {/* window with moon */}
          <Rect x="200" y="28" width="70" height="56" rx="6" fill="#121833" stroke="#3A4580" strokeWidth="3" />
          <Circle cx="248" cy="48" r="10" fill="#FFF3B0" />
          <Circle cx="252" cy="45" r="9" fill="#121833" />
          {/* desk */}
          <Rect x="60" y="112" width="190" height="8" rx="3" fill="#8B5E3C" />
          <Rect x="70" y="120" width="8" height="30" fill="#6E4A2F" />
          <Rect x="232" y="120" width="8" height="30" fill="#6E4A2F" />
          {/* laptop */}
          <Rect x="120" y="86" width="46" height="28" rx="3" fill="#2A3366" />
          <Rect x="124" y="90" width="38" height="20" fill={c} opacity="0.8" />
          {/* books */}
          <Rect x="186" y="98" width="30" height="7" fill="#FF8A3D" />
          <Rect x="189" y="91" width="26" height="7" fill={colors.cyan} />
          <Rect x="187" y="84" width="28" height="7" fill="#FF6B81" />
          {/* lamp */}
          <Path d="M88 112 L88 84 L100 76" stroke="#A6ACCF" strokeWidth="3" fill="none" />
          <Polygon points="94,70 112,80 100,86" fill="#FFE66D" />
          <Person x={145} y={148} c={c} s={0.9} />
        </G>
      );
    case 'startup':
      return (
        <G>
          <Ground />
          {/* garage */}
          <Polygon points="40,90 110,60 180,90" fill="#2A3366" />
          <Rect x="50" y="90" width="120" height="58" fill="#1C2447" />
          <Rect x="62" y="100" width="96" height="48" fill="#121833" stroke="#3A4580" strokeWidth="2" />
          <Rect x="78" y="116" width="40" height="22" rx="2" fill={c} opacity="0.85" />
          {/* lightbulb */}
          <Circle cx="140" cy="118" r="8" fill="#FFE66D" />
          <Rect x="137" y="126" width="6" height="5" fill="#A6ACCF" />
          {/* rocket */}
          <G transform="translate(240 40) rotate(20)">
            <Path d="M0 0 Q12 20 10 50 L-10 50 Q-12 20 0 0 Z" fill="#F3F4FF" />
            <Circle cx="0" cy="22" r="5" fill={c} />
            <Polygon points="-10,40 -18,56 -10,50" fill={colors.orange} />
            <Polygon points="10,40 18,56 10,50" fill={colors.orange} />
            <Polygon points="-6,50 0,72 6,50" fill="#FFE66D" />
          </G>
          <Person x={200} y={148} c={c} s={0.9} />
        </G>
      );
    case 'office':
      return (
        <G>
          <Building x={20} w={50} h={90} c="#2A3366" />
          <Building x={78} w={60} h={120} c="#323C78" />
          <Building x={146} w={44} h={80} c="#2A3366" />
          <Building x={198} w={70} h={110} c="#323C78" />
          <Building x={274} w={40} h={70} c="#2A3366" />
          <Ground />
          {/* briefcase */}
          <Rect x="200" y="130" width="28" height="18" rx="3" fill="#8B5E3C" />
          <Rect x="208" y="125" width="12" height="6" rx="2" fill="none" stroke="#8B5E3C" strokeWidth="3" />
          <Person x={170} y={148} c={c} s={0.9} />
        </G>
      );
    case 'creative':
      return (
        <G>
          <Ground fill="#22183F" />
          {/* easel */}
          <Path d="M110 150 L140 60 L170 150" stroke="#8B5E3C" strokeWidth="5" fill="none" />
          <Rect x="102" y="62" width="76" height="58" rx="3" fill="#F3F4FF" />
          <Circle cx="124" cy="84" r="11" fill={c} />
          <Circle cx="150" cy="96" r="13" fill={colors.orange} opacity="0.85" />
          <Path d="M110 112 Q140 92 170 110" stroke={colors.cyan} strokeWidth="5" fill="none" />
          {/* music note */}
          <G transform="translate(230 50)">
            <Rect x="10" y="0" width="4" height="34" fill="#FFE66D" />
            <Path d="M14 0 Q26 6 24 16" stroke="#FFE66D" strokeWidth="4" fill="none" />
            <Circle cx="6" cy="34" r="8" fill="#FFE66D" />
          </G>
          {/* palette */}
          <Circle cx="60" cy="132" r="16" fill="#C9A27A" />
          <Circle cx="54" cy="126" r="3.5" fill="#FF6B81" />
          <Circle cx="64" cy="124" r="3.5" fill={colors.cyan} />
          <Circle cx="68" cy="134" r="3.5" fill="#FFE66D" />
          <Person x={210} y={148} c={c} s={0.9} />
        </G>
      );
    case 'city_move':
      return (
        <G>
          <G opacity="0.6">
            <Building x={170} w={34} h={70} c="#2A3366" />
            <Building x={208} w={44} h={95} c="#323C78" />
            <Building x={256} w={30} h={60} c="#2A3366" />
            <Building x={290} w={30} h={80} c="#323C78" />
          </G>
          <Ground />
          {/* road */}
          <Polygon points="40,180 120,148 160,148 150,180" fill="#2A3366" />
          <Rect x="118" y="160" width="10" height="4" fill="#FFE66D" />
          {/* plane */}
          <G transform="translate(70 40) rotate(-10)">
            <Rect x="0" y="0" width="56" height="10" rx="5" fill="#F3F4FF" />
            <Polygon points="20,4 34,4 26,-14" fill="#F3F4FF" />
            <Polygon points="20,8 34,8 26,24" fill="#D9DBF0" />
            <Polygon points="0,2 8,2 2,-8" fill={c} />
          </G>
          {/* suitcase */}
          <Rect x="92" y="126" width="26" height="22" rx="4" fill={colors.orange} />
          <Rect x="100" y="120" width="10" height="6" rx="2" fill="none" stroke={colors.orange} strokeWidth="3" />
          <Person x={70} y={148} c={c} s={0.9} />
        </G>
      );
    case 'health':
      return (
        <G>
          <Circle cx="260" cy="44" r="20" fill="#FFE66D" />
          <Path d="M0 130 Q80 96 160 128 Q240 98 320 126 L320 180 L0 180 Z" fill="#2F9E6E" />
          <Path d="M0 150 Q160 136 320 152" stroke="#F3F4FF" strokeWidth="3" strokeDasharray="10 8" fill="none" opacity="0.6" />
          {/* dumbbell */}
          <Rect x="44" y="132" width="34" height="5" fill="#A6ACCF" />
          <Rect x="38" y="126" width="8" height="17" rx="2" fill="#2A3366" />
          <Rect x="76" y="126" width="8" height="17" rx="2" fill="#2A3366" />
          {/* heart */}
          <Path d="M210 92 C210 82 224 80 226 90 C228 80 242 82 242 92 C242 104 226 112 226 112 C226 112 210 104 210 92 Z" fill="#FF6B81" />
          <Person x={150} y={146} c={c} s={0.95} />
        </G>
      );
    case 'travel':
      return (
        <G>
          <Polygon points="0,148 70,70 140,148" fill="#323C78" />
          <Polygon points="90,148 170,50 250,148" fill="#2A3366" />
          <Polygon points="152,72 170,50 188,72 178,68 170,74 162,68" fill="#F3F4FF" />
          <Polygon points="200,148 260,90 320,148" fill="#323C78" />
          <Ground />
          {/* globe */}
          <Circle cx="270" cy="40" r="18" fill={colors.cyan} />
          <Path d="M256 34 Q266 30 270 38 Q276 46 284 42" stroke="#2F9E6E" strokeWidth="5" fill="none" />
          {/* backpack */}
          <Rect x="100" y="124" width="20" height="24" rx="6" fill={colors.orange} />
          <Person x={130} y={148} c={c} s={0.9} />
        </G>
      );
    case 'teaching':
      return (
        <G>
          <Ground />
          {/* board */}
          <Rect x="60" y="34" width="150" height="80" rx="4" fill="#1F4D3A" stroke="#8B5E3C" strokeWidth="5" />
          <Path d="M76 56 L150 56 M76 72 L180 72 M76 88 L130 88" stroke="#F3F4FF" strokeWidth="3" opacity="0.8" />
          <Path d="M168 84 L176 94 L194 70" stroke="#FFE66D" strokeWidth="4" fill="none" />
          {/* students */}
          <G opacity="0.9">
            <Circle cx="240" cy="122" r="7" fill="#FFD8B5" />
            <Rect x="232" y="130" width="16" height="18" rx="6" fill={colors.cyan} />
            <Circle cx="272" cy="122" r="7" fill="#C68B59" />
            <Rect x="264" y="130" width="16" height="18" rx="6" fill={colors.orange} />
          </G>
          <Path d="M286 92 C286 86 294 85 295 91 C296 85 304 86 304 92 C304 99 295 104 295 104 C295 104 286 99 286 92 Z" fill="#FF6B81" />
          <Person x={110} y={148} c={c} s={0.9} />
        </G>
      );
    case 'outdoors':
      return (
        <G>
          <Polygon points="0,148 90,60 180,148" fill="#2A3366" />
          <Polygon points="130,148 230,70 330,148" fill="#323C78" />
          <Ground fill="#1F4D3A" />
          <Tree x={40} y={148} s={1.1} />
          <Tree x={290} y={148} s={0.9} />
          {/* tent */}
          <Polygon points="180,148 214,100 248,148" fill={colors.orange} />
          <Polygon points="206,148 214,124 222,148" fill="#22183F" />
          {/* campfire */}
          <Polygon points="120,148 128,128 136,148" fill="#FFB800" />
          <Polygon points="124,148 128,136 132,148" fill="#FFE66D" />
          <Person x={90} y={148} c={c} s={0.9} />
        </G>
      );
    case 'balance':
    default:
      return (
        <G>
          <Circle cx="262" cy="44" r="16" fill="#FFE66D" opacity="0.9" />
          <Ground fill="#1F4D3A" />
          {/* house */}
          <Polygon points="60,96 110,60 160,96" fill="#FF6B81" />
          <Rect x="70" y="96" width="80" height="52" fill="#F3F4FF" />
          <Rect x="102" y="116" width="18" height="32" fill="#8B5E3C" />
          <Rect x="80" y="106" width="14" height="14" fill={c} opacity="0.8" />
          <Rect x="128" y="106" width="14" height="14" fill={c} opacity="0.8" />
          <Tree x={200} y={148} s={1.1} />
          {/* bench */}
          <Rect x="236" y="128" width="40" height="5" fill="#8B5E3C" />
          <Rect x="240" y="133" width="4" height="15" fill="#6E4A2F" />
          <Rect x="268" y="133" width="4" height="15" fill="#6E4A2F" />
          <Person x={180} y={148} c={c} s={0.85} />
        </G>
      );
  }
}
