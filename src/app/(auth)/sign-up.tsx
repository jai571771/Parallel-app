import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, ErrorBox, Field, Label, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() || null } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    // With "Confirm email" enabled Supabase returns no session until the link is clicked.
    if (!data.session) setCheckEmail(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Label>Free · no payment needed</Label>
        <T variant="h1">Create your account</T>
        <T color={colors.textMuted}>Your scenarios are private by default. Nothing is shared unless you choose to.</T>
        <Field label="First name (optional)" value={name} onChangeText={setName} placeholder="What should we call you?" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 6 characters" />
        {error ? <ErrorBox message={error} /> : null}
        {checkEmail ? (
          <Card accent={colors.cyan}>
            <T>Check your inbox to confirm your email, then come back and sign in.</T>
          </Card>
        ) : null}
        <Button title="Create account" onPress={submit} loading={loading} disabled={!email || !password} />
        <Link href="/sign-in" style={{ color: colors.violetSoft, textAlign: 'center', fontSize: 15 }}>
          Already have an account? Sign in
        </Link>
      </Screen>
    </KeyboardAvoidingView>
  );
}
