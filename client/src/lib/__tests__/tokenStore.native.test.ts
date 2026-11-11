import * as SecureStore from 'expo-secure-store';
import { tokenStore } from '../tokenStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

test('reads the native app JWT from SecureStore', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('app-jwt');
  await expect(tokenStore.get()).resolves.toBe('app-jwt');
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith('buildapc.appJwt');
});

test('saves and removes the app JWT using the same storage key', async () => {
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
  await tokenStore.set('app-jwt');
  await tokenStore.clear();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('buildapc.appJwt', 'app-jwt');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('buildapc.appJwt');
});

test('SecureStore failures reach the session controller for recovery', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('Read failed'));
  jest.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('Write failed'));
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValue(new Error('Delete failed'));
  await expect(tokenStore.get()).rejects.toThrow('Read failed');
  await expect(tokenStore.set('jwt')).rejects.toThrow('Write failed');
  await expect(tokenStore.clear()).rejects.toThrow('Delete failed');
});
