import { registerRootComponent } from 'expo';
import App from './App';
import { initCrashReporting } from './src/monitoring/sentry';
import { registerStreakWidget } from './src/widget/platform';

// Before anything else renders, so a crash during startup is still reported.
initCrashReporting();

registerRootComponent(App);

// Lets Android redraw the home-screen streak widget while the app is closed.
registerStreakWidget();
