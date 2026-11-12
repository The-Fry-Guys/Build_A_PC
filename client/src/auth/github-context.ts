import { createContext, useContext } from 'react';

export interface AndroidGitHubState {
  ready: boolean;
  pending: boolean;
  error: string | null;
  start: () => void;
}

export const AndroidGitHubContext = createContext<AndroidGitHubState>({
  ready: false,
  pending: false,
  error: null,
  start: () => {},
});

export function useAndroidGitHub() {
  return useContext(AndroidGitHubContext);
}
