import { Text, View } from 'react-native';
import type { Meters } from '@/lib/types';
import { LEVEL_DISPLAY, METERS } from '@/lib/visual';
import { colors, radius, spacing } from '@/theme';
import { T } from './ui';

export const hasMeters = (m: Meters | null | undefined) => !!m && Object.keys(m).length > 0;

/**
 * Five life areas with simple more / same / less arrows. Qualitative on purpose:
 * PARALLEL never shows made-up percentages.
 */
export function LifeMeters({ meters, showNotes = true }: { meters: Meters; showNotes?: boolean }) {
  if (!hasMeters(meters)) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      {METERS.map(({ key, icon, label }) => {
        const m = meters[key];
        if (!m) return null;
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ fontSize: 20, width: 28 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>{label}</T>
              {showNotes && m.note ? <T variant="small" color={colors.textFaint}>{m.note}</T> : null}
            </View>
            <MeterChip level={m.level} />
          </View>
        );
      })}
    </View>
  );
}

export function MeterChip({ level, compact }: { level: keyof typeof LEVEL_DISPLAY; compact?: boolean }) {
  const d = LEVEL_DISPLAY[level];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: d.color + '22',
        borderWidth: 1,
        borderColor: d.color + '66',
        alignSelf: compact ? 'center' : undefined,
      }}
    >
      <Text style={{ color: d.color, fontSize: 12, fontWeight: '800' }}>{d.arrows}</Text>
      {!compact ? <Text style={{ color: d.color, fontSize: 12, fontWeight: '600' }}>{d.text}</Text> : null}
    </View>
  );
}
