import { ApiError, type AppUser, type GitHubLoginInput, type GitHubLoginResult } from './api';
import type { TokenStore } from './tokenStore.types';

export interface SessionState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

// SSR and hydration must agree even if restoration finishes before a lazy route
// hydrates. Only the live client snapshot follows subsequent store updates.
const SERVER_SNAPSHOT: SessionState = Object.freeze({ user: null, loading: true, error: null });

/** Owns session state; generations prevent stale requests from undoing logout. */
export class Session {
  private state: SessionState = SERVER_SNAPSHOT;
  private listeners = new Set<() => void>();
  private generation = 0;
  private writes: Promise<unknown> = Promise.resolve();

  constructor(private readonly dependencies: {
    store: TokenStore;
    getMe: () => Promise<AppUser>;
    exchange: (input: GitHubLoginInput) => Promise<GitHubLoginResult>;
  }) {}

  getSnapshot = () => this.state;
  getServerSnapshot = () => SERVER_SNAPSHOT;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(state: SessionState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private write(action: () => Promise<void>) {
    const result = this.writes.then(action);
    this.writes = result.catch(() => undefined);
    return result;
  }

  private async load(generation: number) {
    const user = await this.dependencies.getMe();
    if (generation === this.generation) {
      this.update({ user, loading: false, error: null });
    }
  }

  private async failed(error: unknown, generation: number) {
    if (generation !== this.generation) return;
    if (error instanceof ApiError && error.status === 401) {
      try {
        await this.write(() => this.dependencies.store.clear());
      } catch {
        if (generation === this.generation) {
          this.update({ user: null, loading: false, error: 'Session ended, but browser storage could not be cleared. Retry logout.' });
        }
        return;
      }
      if (generation !== this.generation) return;
      this.update({ user: null, loading: false, error: 'Your session ended. Sign in again.' });
      return;
    }
    this.update({ user: null, loading: false, error: error instanceof Error ? error.message : 'Could not load your session.' });
  }

  restore = async () => {
    const generation = ++this.generation;
    this.update({ user: null, loading: true, error: null });
    try {
      await this.writes;
      const token = await this.dependencies.store.get();
      if (generation !== this.generation) return;
      if (!token) {
        this.update({ user: null, loading: false, error: null });
        return;
      }
      await this.load(generation);
    } catch (error) {
      await this.failed(error, generation);
    }
  };

  /** Rechecks current database permissions while retaining the active screen during the request. */
  refresh = async () => {
    if (this.state.loading || !this.state.user) return;
    const generation = ++this.generation;
    try {
      await this.load(generation);
    } catch (error) {
      await this.failed(error, generation);
    }
  };

  /** Ends an expired API session using the same guarded storage cleanup as restoration. */
  expire = async () => {
    const generation = ++this.generation;
    await this.failed(new ApiError(401, 'Your session ended. Sign in again.'), generation);
  };

  login = async (input: GitHubLoginInput) => {
    const generation = ++this.generation;
    this.update({ user: null, loading: true, error: null });
    try {
      const result = await this.dependencies.exchange(input);
      if (generation !== this.generation) return;
      await this.write(async () => {
        if (generation === this.generation) await this.dependencies.store.set(result.token);
      });
      if (generation !== this.generation) return;
      await this.load(generation);
    } catch (error) {
      await this.failed(error, generation);
    }
  };

  logout = async () => {
    const generation = ++this.generation;
    this.update({ user: null, loading: true, error: null });
    try {
      await this.write(() => this.dependencies.store.clear());
      if (generation === this.generation) this.update({ user: null, loading: false, error: null });
    } catch {
      if (generation === this.generation) {
        this.update({ user: null, loading: false, error: 'Could not clear browser storage. Retry logout.' });
      }
    }
  };
}
