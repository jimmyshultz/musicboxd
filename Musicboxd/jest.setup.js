import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-gesture-handler', () => {
  return {
    GestureHandlerRootView: ({ children }: any) => children,
    PanGestureHandler: ({ children }: any) => children,
    TapGestureHandler: ({ children }: any) => children,
    State: {},
    Directions: {},
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockedDatePicker(props: any) {
    return React.createElement(View, null, React.createElement(Text, null, 'DatePicker'));
  };
});