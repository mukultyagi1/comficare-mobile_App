import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, List, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { useSession } from '../../SessionContext';
import { departmentsApi, designationsApi, employeesApi, positionsApi } from '../../api/directory';
import { colors } from '../../theme';

const DEPT_PERMS = ['MASTER_DATA_MANAGE', 'DEPARTMENT_VIEW'];
const EMPLOYEE_PERMS = ['MASTER_DATA_MANAGE', 'DEPARTMENT_VIEW', 'EMPLOYEE_CREATE', 'EMPLOYEE_EDIT', 'EMPLOYEE_DELETE'];

// Combines comficare-frontend's Department/Position/Job Category/Employee
// pages behind one section (Phase 1: read-only browse; create/edit/delete,
// Excel import/export, and bulk actions stay web-only for now), each tab
// gated the same way its web route is.
function useTabs() {
  const { hasAnyPermission } = useSession();
  return useMemo(() => {
    const tabs = [];
    if (hasAnyPermission(DEPT_PERMS)) {
      tabs.push({ value: 'departments', label: 'Departments', api: departmentsApi, titleOf: (i) => i.deptName, subtitleOf: (i) => i.status });
      tabs.push({ value: 'positions', label: 'Positions', api: positionsApi, titleOf: (i) => i.name, subtitleOf: (i) => i.status });
      tabs.push({ value: 'designations', label: 'Job Category', api: designationsApi, titleOf: (i) => i.jobTitle, subtitleOf: (i) => i.jobCode });
    }
    if (hasAnyPermission(EMPLOYEE_PERMS)) {
      tabs.push({
        value: 'employees',
        label: 'Employees',
        api: employeesApi,
        titleOf: (i) => `${i.firstName} ${i.lastName}`,
        subtitleOf: (i) => i.email,
      });
    }
    return tabs;
  }, [hasAnyPermission]);
}

export default function DirectoryListScreen({ navigation }) {
  const tabs = useTabs();
  const [tab, setTab] = useState(tabs[0]?.value);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const activeTab = tabs.find((t) => t.value === tab) ?? tabs[0];

  const load = useCallback(async () => {
    if (!activeTab) return;
    setLoading(true);
    try {
      setError(null);
      const data = await activeTab.api.list({ pageSize: 200 });
      setItems(data?.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const haystack = `${activeTab.titleOf(item)} ${activeTab.subtitleOf(item) ?? ''} ${item.displayId ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (!activeTab) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>You don't have access to any directory sections.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {tabs.length > 1 && (
          <SegmentedButtons
            value={tab ?? activeTab.value}
            onValueChange={setTab}
            buttons={tabs.map((t) => ({ value: t.value, label: t.label }))}
            style={styles.segmented}
          />
        )}
        <Searchbar placeholder="Search" value={search} onChangeText={setSearch} style={styles.search} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>Nothing found.</Text>}
          renderItem={({ item }) => (
            <List.Item
              title={activeTab.titleOf(item)}
              description={activeTab.subtitleOf(item)}
              onPress={() => navigation.navigate('DirectoryDetail', { title: activeTab.titleOf(item), record: item })}
              left={(props) => <List.Icon {...props} icon="chevron-right" />}
              right={() => (item.status ? <Chip compact>{item.status}</Chip> : null)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 12, gap: 8 },
  segmented: { marginBottom: 4 },
  search: { elevation: 0 },
  error: { color: '#dc2626', padding: 16 },
  empty: { color: '#999', padding: 24, textAlign: 'center' },
});
