import { registerRootComponent } from 'expo';

// Must be imported before the app mounts — expo-task-manager requires the
// background location task to be defined synchronously on every JS load,
// including headless relaunches the OS performs solely to deliver a
// location event while the app isn't actively running.
import './src/backgroundLocationTask';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
