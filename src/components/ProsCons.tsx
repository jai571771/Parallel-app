import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { T } from './ui';

/** Two simple columns: the good parts and the hard parts of a life. */
export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  if (!pros.length && !cons.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Column title="👍 Good parts" items={pros} color={colors.success} />
      <Column title="🤔 Hard parts" items={cons} color={colors.orange} />
    </View>
  );
}

function Column({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color + '14',
        borderColor: color + '44',
        borderWidth: 1,
        borderRadius: radius.sm,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <T variant="small" color={color} style={{ fontWeight: '700' }}>{title}</T>
      {items.map((it, i) => (
        <T key={i} variant="small" color={colors.text}>{it}</T>
      ))}
    </View>
  );
}
