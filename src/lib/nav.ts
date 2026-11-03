import { router } from 'expo-router';

/**
 * Go back if there's a previous screen; otherwise go home. Screens opened from a
 * link or notification have no history, and plain router.back() would do nothing.
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
