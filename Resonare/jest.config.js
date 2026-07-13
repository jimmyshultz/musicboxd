module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|react-native-paper' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|@react-navigation' +
      '|react-redux' +
      '|@reduxjs/toolkit' +
      '|immer' +
      '|react-native-url-polyfill' +
      '|react-native-vector-icons' +
      '|@d11/react-native-fast-image' +
      '|bad-words' +
      '|badwords-list' +
      ')/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
