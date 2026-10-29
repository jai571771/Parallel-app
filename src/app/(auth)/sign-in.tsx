import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button, ErrorBox, Field, Label, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    // On success the auth listener swaps the navigator to the signed-in screens.
    if (error) setError(error.message);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Label>Welcome back</Label>
        <T variant="h1">Sign in</T>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" />
        {error ? <ErrorBox message={error} /> : null}
        <Button title="Sign in" onPress={submit} loading={loading} disabled={!email || !password} />
        <Link href="/sign-up" style={{ color: colors.violetSoft, textAlign: 'center', fontSize: 15 }}>
          New here? Create an account
        </Link>
      </Screen>
    </KeyboardAvoidingView>
  );
}
