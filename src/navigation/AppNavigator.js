import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';
import MenuScreen from '../screens/MenuScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import LocationTeamListScreen from '../screens/location/LocationTeamListScreen';
import LocationDetailScreen from '../screens/location/LocationDetailScreen';
import DirectoryListScreen from '../screens/directory/DirectoryListScreen';
import DirectoryDetailScreen from '../screens/directory/DirectoryDetailScreen';
import RosterScreen from '../screens/RosterScreen';
import LeaveScreen from '../screens/LeaveScreen';
import TimesheetScreen from '../screens/TimesheetScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// A single flat stack, landing on Dashboard (comficare-frontend's own
// / → /dashboard redirect after sign-in). Every other header carries a menu
// icon to reach Menu (see screens/MenuScreen.js) — the hub listing every
// section the signed-in role can see, same section → permission map as
// navigation/navItems.js.
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ navigation, route }) => ({
          headerRight: () =>
            route.name === 'Menu' ? null : <IconButton icon="view-grid-outline" onPress={() => navigation.navigate('Menu')} />,
        })}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Self Service' }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Comficare' }} />
        <Stack.Screen name="LocationList" component={LocationTeamListScreen} options={{ title: 'Team Location' }} />
        <Stack.Screen name="LocationDetail" component={LocationDetailScreen} options={{ title: 'Location' }} />
        <Stack.Screen name="DirectoryList" component={DirectoryListScreen} options={{ title: 'Directory' }} />
        <Stack.Screen name="DirectoryDetail" component={DirectoryDetailScreen} options={{ title: 'Details' }} />
        <Stack.Screen name="Roster" component={RosterScreen} options={{ title: 'Roster' }} />
        <Stack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leave Management' }} />
        <Stack.Screen name="Timesheet" component={TimesheetScreen} options={{ title: 'Timesheet' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
