import { registerRootComponent } from 'expo';
import App from './App';
import { initCrashReporting } from './src/monitoring/sentry';

// Before anything else renders, so a crash during startup is still reported.
initCrashReporting();

registerRootComponent(App);
