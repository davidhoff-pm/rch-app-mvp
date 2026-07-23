// Setup file for Jest

global.__DEV__ = false;

// Mock react-native (Platform uniquement — cible plateforme native par défaut dans les tests)
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios ?? obj.default,
  },
}));

// Mock MMKV storage
jest.mock('react-native-mmkv', () => {
  const mockStorage = new Map();

  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key, value) => mockStorage.set(key, value)),
      getString: jest.fn((key) => mockStorage.get(key)),
      delete: jest.fn((key) => mockStorage.delete(key)),
      clearAll: jest.fn(() => mockStorage.clear()),
      getAllKeys: jest.fn(() => Array.from(mockStorage.keys())),
    })),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
