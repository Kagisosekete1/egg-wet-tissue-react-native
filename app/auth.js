import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Brand, Button, Card, Field, Screen, Title, s, C } from '../src/components/ui';

export default function Auth() {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert('Check your details', 'Enter your email and password.');
      return;
    }
    if (signup && password.length < 6) {
      Alert.alert('Check your password', 'Use at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      const result = signup
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { data: { username: username.trim() || normalizedEmail.split('@')[0], country_code: 'ZA' } },
          })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (result.error) throw result.error;
      if (signup && !result.data.session) {
        Alert.alert('Check your email', 'Confirm your email address, then sign in.');
        setSignup(false);
        return;
      }
      if (result.data.session) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign in unavailable', 'No active session was returned. Please try again.');
      }
    } catch (error) {
      const message = error?.message || 'Please check your internet connection and try again.';
      Alert.alert(signup ? 'Sign up failed' : 'Sign in failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Enter your email', 'Type your account email first, then choose Forgot password.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (error) throw error;
      Alert.alert('Check your email', 'If an account exists for that address, you will receive a password reset link.');
    } catch (error) {
      Alert.alert('Could not send reset link', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Brand subtitle="Welcome back" />
      <Card>
        <Title>{signup ? 'Create your account' : 'Sign in'}</Title>
        <Text style={s.muted}>{signup ? 'Create an account to save your progress.' : 'Sign in to continue playing.'}</Text>
        {signup && <Field label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <View style={{ gap: 7 }}>
          <Text style={s.label}>Password</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 15, borderColor: C.line, borderWidth: 1, backgroundColor: '#fffaf1' }}>
            <TextInput value={password} onChangeText={setPassword} placeholder={signup ? 'At least 6 characters' : 'Enter your password'} placeholderTextColor={C.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} textContentType={signup ? 'newPassword' : 'password'} style={{ flex: 1, height: 50, paddingHorizontal: 14, color: C.ink, fontSize: 15 }} />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ color: C.ink, fontWeight: '800' }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </View>
        {!signup && <Pressable disabled={busy} onPress={resetPassword} hitSlop={8}><Text style={{ color: C.ink, fontWeight: '800', textAlign: 'right' }}>Forgot password?</Text></Pressable>}
        <Button title={busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy} />
        <Button title={signup ? 'I already have an account' : 'Create a new account'} onPress={() => setSignup(!signup)} secondary disabled={busy} />
      </Card>
    </Screen>
  );
}

