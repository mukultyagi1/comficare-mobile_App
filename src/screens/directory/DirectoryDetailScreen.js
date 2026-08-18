import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

const HIDDEN_FIELDS = new Set(['tenantId', 'id']);

function formatValue(value) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    return value.deptName ?? value.name ?? value.jobTitle ?? value.firstName ?? value.displayId ?? JSON.stringify(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

function labelFor(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// Generic read-only field dump — Phase 1 keeps Directory browse-only, so
// there's no per-type detail form to build yet (see DirectoryListScreen.js).
export default function DirectoryDetailScreen({ route }) {
  const { title, record } = route.params;
  const entries = Object.entries(record).filter(([key]) => !HIDDEN_FIELDS.has(key));

  return (
    <ScrollView style={styles.safeArea} contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{labelFor(key)}</Text>
          <Text style={styles.value}>{formatValue(value)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  container: { padding: 16 },
  title: { marginBottom: 16 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, marginTop: 2 },
});
