import * as SecureStore from 'expo-secure-store';

import type { TokenStore } from './tokenStore.types';

const TOKEN_KEY = 'buildapc.appJwt';

/** Stores the app JWT in encrypted native storage. */
export const tokenStore: TokenStore = {
  get() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  set(token) {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  clear() {
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
