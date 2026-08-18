import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Badge, List, Text } from 'react-native-paper';
import { locationApi } from '../../api/location';
import { onLocationUpdate } from '../../locationSocket';
import { isLive } from '../../utils/location';
import { colors } from '../../theme';

// Matches comficare-frontend's LocationPage.jsx: an initial REST snapshot
// (GET /location/employees) kept live by merging location:update broadcasts
// as they arrive, gated behind LOCATION_VIEW (see navigation/navItems.js).
export default function LocationTeamListScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await locationApi.list();
      setEmployees(data?.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates from the socket — the same one MyLocationScreen shares via
  // SessionContext — keep the badges current without polling.
  useEffect(() => {
    return onLocationUpdate((update) => {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === update.employeeId
            ? {
                ...emp,
                location: {
                  latitude: update.latitude,
                  longitude: update.longitude,
                  isSharing: update.isSharing,
                  updatedAt: update.updatedAt,
                },
              }
            : emp,
        ),
      );
    });
  }, []);

  // Re-checks the 90s staleness window even when no new update has arrived.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>No employees found.</Text>}
        renderItem={({ item }) => {
          const live = isLive(item.location);
          return (
            <List.Item
              title={`${item.firstName} ${item.lastName}`}
              description={item.department?.deptName ?? '—'}
              onPress={() => navigation.navigate('LocationDetail', { employee: item })}
              left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
              right={() => (
                <View style={styles.badgeWrap}>
                  <Badge style={live ? styles.badgeLive : styles.badgeOffline}>{live ? 'Live' : 'Offline'}</Badge>
                </View>
              )}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { justifyContent: 'center' },
  badgeLive: { backgroundColor: '#16a34a' },
  badgeOffline: { backgroundColor: '#9ca3af' },
  error: { color: '#dc2626', padding: 16 },
  empty: { color: '#999', padding: 24, textAlign: 'center' },
});
