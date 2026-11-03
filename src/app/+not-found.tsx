import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Any address that doesn't match a screen the user can see — e.g. "/" while signed
 * out, or an old link — lands here and is sent somewhere sensible.
 */
export default function NotFound() {
  const { session } = useAuth();
  return <Redirect href={session ? '/' : '/welcome'} />;
}
