import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL = 'daily-reminder';

export const REMINDER_OPTIONS = [
  { label: 'Morning', time: '08:00', emoji: '🌅' },
  { label: 'Lunch', time: '13:00', emoji: '🌞' },
  { label: 'Evening', time: '19:00', emoji: '🌆' },
  { label: 'Night', time: '21:00', emoji: '🌙' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Schedules (or clears, when `time` is null) Pip's daily local reminder.
 * Local notifications work in Expo Go; remote push would need a dev build.
 * Returns false if the user declined notification permission.
 */
export async function scheduleDailyReminder(time: string | null): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!time) return true;

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily What-If reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pip: Your What-If of the day is ready 🔮',
      body: 'One tiny choice. Two possible lives. Keep your streak glowing! 🔥',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}
