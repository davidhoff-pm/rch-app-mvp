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
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
