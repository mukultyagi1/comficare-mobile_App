import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { timesheetsApi } from '../api/timesheet';
import { colors, statusColors } from '../theme';

// Matches comficare-frontend's TimesheetPage.jsx scope (Phase 1: view +
// approve/reject; CSV export and inline edit stay web-only for now).
// Gated behind TIMESHEET_VIEW / TIMESHEET_APPROVE, same as web.
export default function TimesheetScreen() {
  const { hasPermission } = useSession();
  const canApprove = hasPermission('TIMESHEET_APPROVE');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await timesheetsApi.list({});
      setEntries(data?.items ?? []);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const approve = useCallback(async (id) => {
    await timesheetsApi.approve(id);
    load();
  }, [load]);

  const reject = useCallback(async (id) => {
    await timesheetsApi.reject(id);
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
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>No timesheet entries.</Text>}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="bodyLarge">
                {item.employee?.firstName} {item.employee?.lastName}
              </Text>
              <Text style={styles.muted}>
                {item.date ? new Date(item.date).toLocaleDateString() : '—'} · {item.workedHours != null ? `${item.workedHours.toFixed?.(1) ?? item.workedHours}h` : '—'}
              </Text>
            </View>
            <Chip compact style={{ backgroundColor: statusColors(item.status).backgroundColor }} textStyle={{ color: statusColors(item.status).color }}>
              {item.status ?? 'PENDING'}
            </Chip>
            {canApprove && item.status === 'PENDING' && (
              <View style={styles.actions}>
                <Button compact onPress={() => approve(item.id)}>
                  Approve
                </Button>
                <Button compact textColor={colors.error} onPress={() => reject(item.id)}>
                  Reject
                </Button>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1 },
  actions: { flexDirection: 'row' },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.error, padding: 16 },
  empty: { color: colors.textMuted, padding: 24, textAlign: 'center' },
});
