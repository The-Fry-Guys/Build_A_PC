import type { TokenStore } from './tokenStore.types';

const TOKEN_KEY = 'buildapc.appJwt';

/** Stores the app JWT for the current browser tab session. */
export const tokenStore: TokenStore = {
  async get() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(TOKEN_KEY);
  },

  async set(token) {
    if (typeof window === 'undefined') {
      throw new Error('Token storage requires a browser.');
    }

    window.sessionStorage.setItem(TOKEN_KEY, token);
  },

  async clear() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
  },
};
