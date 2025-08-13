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
      ')/)'
  ],
  setupFiles: [
    '<rootDir>/jest.setup.js'
  ],
};
