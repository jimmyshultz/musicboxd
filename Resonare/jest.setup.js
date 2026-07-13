/* global jest */
import 'react-native-gesture-handler/jestSetup';

// @supabase/supabase-js (>=2.10x) requires a global WebSocket when the realtime
// client is created. React Native provides one at runtime, but Node (the test
// env) does not, so supply an inert stub. Realtime is never exercised in tests;
// the app's connection probe just times out harmlessly.
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class {
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Firebase native modules are unavailable under Jest; mock the modular API
// surfaces the app actually imports so tests can render without a native build.
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  getMessaging: jest.fn(() => ({})),
  setBackgroundMessageHandler: jest.fn(),
  onMessage: jest.fn(() => jest.fn()),
  requestPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('test-token')),
  registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  getCrashlytics: jest.fn(() => ({})),
  setCrashlyticsCollectionEnabled: jest.fn(),
  setAttributes: jest.fn(),
  log: jest.fn(),
  recordError: jest.fn(),
  setUserId: jest.fn(),
  crash: jest.fn(),
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => {
  return {
    GestureHandlerRootView: ({ children }) => children,
    PanGestureHandler: ({ children }) => children,
    TapGestureHandler: ({ children }) => children,
    State: {},
    Directions: {},
  };
});

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  appleAuth: {
    isSupported: false,
    performRequest: jest.fn(() => Promise.resolve({})),
    Operation: {},
    Scope: {},
  },
  AppleButton: () => null,
}));

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    ENVIRONMENT: 'test',
    APP_NAME: 'Resonare',
    BUNDLE_ID: 'com.resonare.test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({})),
    signOut: jest.fn(() => Promise.resolve()),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
  },
  GoogleSigninButton: () => null,
  statusCodes: {},
}));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({
    initialize: jest.fn(() => Promise.resolve([])),
    setRequestConfiguration: jest.fn(() => Promise.resolve()),
  }),
  BannerAd: () => null,
  BannerAdSize: {},
  TestIds: { BANNER: 'test-banner' },
  MaxAdContentRating: {},
}));

jest.mock('react-native-image-crop-picker', () => ({
  __esModule: true,
  default: {
    openPicker: jest.fn(() => Promise.resolve({})),
    openCamera: jest.fn(() => Promise.resolve({})),
    clean: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(() => Promise.resolve()),
    shareSingle: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  default: () => null,
  captureRef: jest.fn(() => Promise.resolve('file://mock')),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockedDatePicker(props) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'DatePicker'),
    );
  };
});
