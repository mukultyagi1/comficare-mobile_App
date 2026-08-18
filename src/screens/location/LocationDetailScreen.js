import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { onLocationUpdate } from '../../locationSocket';
import { isLive, osmEmbedUrl } from '../../utils/location';
import { colors } from '../../theme';

// Matches comficare-frontend's LocationDetailPanel.jsx: same OSM iframe
// embed formula, kept live via the same location:update socket broadcast.
export default function LocationDetailScreen({ route }) {
  const [employee, setEmployee] = useState(route.params.employee);
  const location = employee.location;
  const [, forceTick] = useState(0);

  useEffect(() => {
    return onLocationUpdate((update) => {
      if (update.employeeId !== employee.id) return;
      setEmployee((prev) => ({
        ...prev,
        location: { latitude: update.latitude, longitude: update.longitude, isSharing: update.isSharing, updatedAt: update.updatedAt },
      }));
    });
  }, [employee.id]);

  // Re-checks the 90s staleness window even when no new update has arrived —
  // otherwise this screen would freeze on "Live" forever once the last real
  // update stopped coming in (see LocationTeamListScreen's identical tick).
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const live = isLive(location);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="titleLarge">
          {employee.firstName} {employee.lastName}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {employee.position?.name ?? '—'} · {employee.department?.deptName ?? '—'}
        </Text>
        <Badge style={live ? styles.badgeLive : styles.badgeOffline}>{live ? 'Live' : 'Offline'}</Badge>
      </View>

      {location?.latitude != null && location?.longitude != null ? (
        <WebView source={{ uri: osmEmbedUrl(location.latitude, location.longitude) }} style={styles.map} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.empty}>No location shared yet.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { padding: 16, gap: 4 },
  subtitle: { color: '#666' },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#999' },
  badgeLive: { backgroundColor: '#16a34a', alignSelf: 'flex-start', marginTop: 4 },
  badgeOffline: { backgroundColor: '#9ca3af', alignSelf: 'flex-start', marginTop: 4 },
});
