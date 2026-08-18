import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { rostersApi } from '../api/roster';
import { colors } from '../theme';

// Matches comficare-frontend's RosterPage.jsx data (Phase 1: read-only,
// day-grouped list — the draggable scheduling timeline stays web-only; see
// the plan's Phase 2 notes). Gated behind ROSTER_VIEW, same as web.
export default function RosterScreen() {
  const { user } = useSession();
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await rostersApi.list(user?.deptId ? { departmentId: user.deptId } : undefined);
      setRosters(data?.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.deptId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const groupedByDate = useMemo(() => {
    const lineItems = rosters.flatMap((roster) => (roster.lineItems ?? []).map((li) => ({ ...li, roster })));
    const groups = new Map();
    for (const li of lineItems) {
      const key = new Date(li.date).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(li);
    }
    return Array.from(groups.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [rosters]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {groupedByDate.length === 0 ? (
          <Text style={styles.empty}>No published shifts.</Text>
        ) : (
          groupedByDate.map(([date, items]) => (
            <View key={date} style={styles.dayGroup}>
              <Text variant="titleMedium" style={styles.dayTitle}>
                {date}
              </Text>
              {items.map((li) => (
                <View key={li.id} style={styles.shiftRow}>
                  <Text style={styles.flex}>
                    {li.employee ? `${li.employee.firstName} ${li.employee.lastName}` : 'Open shift'}
                  </Text>
                  <Text style={styles.muted}>
                    {li.startTime} – {li.endTime}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 16 },
  dayGroup: { gap: 4 },
  dayTitle: { marginBottom: 4 },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  flex: { flex: 1 },
  muted: { color: '#999' },
  error: { color: '#dc2626', marginBottom: 8 },
  empty: { color: '#999', textAlign: 'center', marginTop: 24 },
});
