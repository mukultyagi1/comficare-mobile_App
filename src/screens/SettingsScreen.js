import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { colors } from '../theme';

// Kept intentionally minimal for now — just account info + sign out. The
// full web admin suite (leave types, work schedules, public holidays,
// roles & permissions, custom fields) stays web-only (see plan's Phase
// 2/3 notes); nothing else is being added here for the moment.
export default function SettingsScreen() {
  const { user, role, signOut } = useSession();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Avatar.Text size={64} label={(user?.displayName ?? user?.userName ?? user?.email ?? '?').slice(0, 2).toUpperCase()} style={styles.avatar} />
        <Text variant="titleLarge" style={styles.name}>
          {user?.displayName ?? user?.userName ?? user?.email}
        </Text>
        <Text style={styles.role}>{role?.label ?? role?.code ?? ''}</Text>
        <Button mode="contained" icon="logout" buttonColor={colors.error} onPress={signOut} style={styles.signOut}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatar: { marginBottom: 12, backgroundColor: colors.primary },
  name: { color: colors.textPrimary, fontWeight: '700' },
  role: { color: colors.textMuted, marginBottom: 24 },
  signOut: { width: '100%', borderRadius: 8 },
});
