import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, FAB, Text } from 'react-native-paper';
import { useSession } from '../SessionContext';
import { leavesApi } from '../api/leave';
import ApplyLeaveModal from '../components/ApplyLeaveModal';
import { colors, statusColors } from '../theme';

// Matches comficare-frontend's LeaveManagementPage.jsx scope (Phase 1: view +
// apply + approve/reject; attachments and bulk actions stay web-only for
// now). Visible to any signed-in user (no nav permission gate), same as web.
export default function LeaveScreen() {
  const { user, hasPermission } = useSession();
  const employeeId = user?.employeeId;
  const canManage = hasPermission('LEAVE_MANAGE');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [applyModalVisible, setApplyModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await leavesApi.listRequests({});
      setRequests(data?.items ?? []);
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
    await leavesApi.approveRequest(id);
    load();
  }, [load]);

  const reject = useCallback(async (id) => {
    await leavesApi.rejectRequest(id);
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
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>No leave requests.</Text>}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="bodyLarge">
                {item.employee?.firstName} {item.employee?.lastName}
              </Text>
              <Text style={styles.muted}>
                {new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()} ({item.noOfDays ?? '—'}d)
              </Text>
              {item.comments ? <Text style={styles.muted}>{item.comments}</Text> : null}
            </View>
            <Chip compact style={{ backgroundColor: statusColors(item.status).backgroundColor }} textStyle={{ color: statusColors(item.status).color }}>
              {item.status}
            </Chip>
            {canManage && item.status === 'PENDING' && (
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
      <FAB icon="plus" style={styles.fab} onPress={() => setApplyModalVisible(true)} label="Apply" />
      <ApplyLeaveModal
        visible={applyModalVisible}
        onDismiss={() => setApplyModalVisible(false)}
        employeeId={employeeId}
        onSubmitted={() => {
          setApplyModalVisible(false);
          load();
        }}
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
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: colors.primary },
});
