import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = keyof typeof font;

export function T({
  variant = 'body',
  color = colors.text,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[font[variant], { color }, style]} />;
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient colors={['#1A1446', colors.bg, colors.bg]} locations={[0, 0.35, 1]} style={{ flex: 1 }}>
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.screenContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screenContent, { flex: 1 }, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Card({
  children,
  style,
  accent,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={[styles.card, accent ? { borderColor: accent } : null, style]}>{children}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.text;
  const content = (
    <View style={styles.buttonInner}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <T variant="h3" color={fg} style={{ fontSize: 16 }}>
            {title}
          </T>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [{ opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.violet, '#5B8CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            variant === 'secondary' && { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
            variant === 'danger' && { borderWidth: 1, borderColor: colors.danger },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...rest
}: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <T variant="small" color={colors.textMuted}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.violet}
        {...rest}
        style={[styles.input, rest.multiline && { minHeight: 90, textAlignVertical: 'top' }, style]}
      />
      {hint ? <T variant="small" color={colors.textFaint}>{hint}</T> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.violet,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: color + '33', borderColor: color },
      ]}
    >
      <T variant="small" color={selected ? colors.text : colors.textMuted}>
        {label}
      </T>
    </Pressable>
  );
}

export function Label({ children, color = colors.cyan }: { children: ReactNode; color?: string }) {
  return (
    <T variant="label" color={color}>
      {children}
    </T>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textFaint} />
      <T variant="small" color={colors.textFaint} style={{ flex: 1 }}>
        {text ?? 'Illustrative scenarios based on your inputs and stated assumptions — possibilities, not predictions.'}
      </T>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.violet} size="large" />
      {label ? <T color={colors.textMuted} style={{ textAlign: 'center' }}>{label}</T> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card accent={colors.danger} style={{ gap: spacing.md }}>
      <T color={colors.danger}>{message}</T>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Bullets({ items, color = colors.cyan }: { items: string[]; color?: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <T style={{ flex: 1 }} color={colors.textMuted}>
            {item}
          </T>
        </View>
      ))}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <T variant="h3">{title}</T>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  disclaimer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
