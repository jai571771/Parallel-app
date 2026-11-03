import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { goBack } from '@/lib/nav';
import { colors } from '@/theme';

/** Header back arrow that is always shown, and goes home when there's no history. */
export function HeaderBack() {
  return (
    <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back" style={{ paddingRight: 16 }}>
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </Pressable>
  );
}
