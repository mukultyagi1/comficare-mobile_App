import { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { tenantApi } from '../api/tenant';
import { WS_BASE_URL } from '../config';
import { colors as COLORS } from '../theme';

// Mirrors comficare-frontend/src/pages/SignInPage.jsx's look — same copy and
// color tokens (comficare-frontend/src/styles/tokens.css) — so signing in
// feels like the same product on both platforms. Skips remember-me and the
// signup/forgot-password links, since those flows aren't built on mobile yet
// (Phase 1 is sign-in only).
//
// The logo comes from GET /tenants/branding (public, no session needed) —
// whatever the org uploaded via Settings → Application Logo on web — same as
// comficare-frontend's useTenantBranding/BrandLogo. No logo shown at all if
// none has been uploaded yet, matching BrandLogo.jsx's behavior.
export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    tenantApi
      .getBranding()
      .then((branding) => setLogoUrl(branding?.logoUrl ? `${WS_BASE_URL}${branding.logoUrl}` : null))
      .catch(() => setLogoUrl(null));
  }, []);

  const handleSignIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSigningIn(false);
    }
  }, [signIn, email, password]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" /> : null}
            <Text variant="headlineSmall" style={styles.title}>
              Welcome back
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Sign in to your account
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                left={<TextInput.Icon icon="email-outline" />}
                value={email}
                onChangeText={setEmail}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                style={styles.input}
                disabled={signingIn}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                left={<TextInput.Icon icon="lock-outline" />}
                right={<TextInput.Icon icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword((v) => !v)} />}
                value={password}
                onChangeText={setPassword}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                style={styles.input}
                disabled={signingIn}
              />

              <Button
                mode="contained"
                onPress={handleSignIn}
                loading={signingIn}
                disabled={signingIn || !email || !password}
                buttonColor={COLORS.primary}
                contentStyle={styles.signInButtonContent}
                style={styles.signInButton}
              >
                {signingIn ? 'Signing in...' : 'Sign in'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  logo: { width: 180, height: 56, alignSelf: 'center', marginBottom: 20 },
  title: { textAlign: 'center', color: COLORS.textPrimary, fontWeight: '700', marginBottom: 4 },
  subtitle: { textAlign: 'center', color: COLORS.textMuted, marginBottom: 20 },
  errorBanner: { backgroundColor: COLORS.errorTint, borderColor: COLORS.error, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  form: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: COLORS.white },
  signInButton: { borderRadius: 8, marginTop: 18 },
  signInButtonContent: { height: 48 },
});
