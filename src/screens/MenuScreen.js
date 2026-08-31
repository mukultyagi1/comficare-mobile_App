import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, List, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSession } from '../SessionContext';
import { navItems } from '../navigation/navItems';
import { WS_BASE_URL } from '../config';
import { colors } from '../theme';

// Replaces a swipe drawer (which pulled in react-native-reanimated —
// Expo Go's bundled native reanimated module kept crashing with
// TurboModule/NativeProxy errors on the test device, a known class of
// Expo-Go-vs-reanimated-native-version mismatch). A plain menu screen needs
// no animation library at all, so it sidesteps that whole problem. Every
// section a signed-in user is allowed to see still mirrors
// comficare-frontend/src/components/layout/AppLayout.jsx's navItems — same
// section → permission map (see navigation/navItems.js).
export default function MenuScreen({ navigation }) {
  const { user, role, signOut, hasAnyPermission } = useSession();
  const visibleItems = navItems.filter((item) => hasAnyPermission(item.permissions));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.profile} onPress={() => navigation.navigate('Profile')}>
        {user?.avatarUrl ? (
          <Avatar.Image size={48} source={{ uri: `${WS_BASE_URL}${user.avatarUrl}` }} />
        ) : (
          <Avatar.Text size={48} label={(user?.displayName ?? user?.userName ?? user?.email ?? '?').slice(0, 2).toUpperCase()} />
        )}
        <View style={styles.profileText}>
          <Text variant="titleMedium">{user?.displayName ?? user?.userName ?? user?.email}</Text>
          <Text variant="bodySmall" style={styles.role}>
            {role?.label ?? role?.code ?? ''}
          </Text>
        </View>
        <List.Icon icon="chevron-right" />
      </Pressable>
      <Divider />
      <List.Section style={styles.list}>
        {visibleItems.map((item) => (
          <List.Item
            key={item.name}
            title={item.label}
            onPress={() => navigation.navigate(item.name)}
            left={(props) => <MaterialCommunityIcons name={item.icon} size={24} color={props.color} style={styles.icon} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        ))}
      </List.Section>
      <Divider />
      <Button icon="logout" onPress={signOut} style={styles.signOut}>
        Sign out
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  profileText: { flex: 1 },
  role: { color: '#666' },
  list: { flex: 1 },
  icon: { alignSelf: 'center', marginLeft: 16, marginRight: -8 },
  signOut: { margin: 16 },
});
