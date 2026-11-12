import { tokenStore } from './tokenStore';

/** Public user fields returned by the Spring Boot API. */
export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
  role: 'USER' | 'ADMIN';
  created_at: string;
}

/** Code-exchange values obtained from Expo AuthSession. */
export interface GitHubLoginInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/** Our app token and account profile, never GitHub's access token. */
export interface GitHubLoginResult {
  token: string;
  user: AppUser;
}

/** An API failure with its HTTP status available to the UI. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function endpoint(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const problem = body as { detail?: unknown; title?: unknown };

    if (typeof problem.detail === 'string' && problem.detail.trim()) {
      return problem.detail;
    }

    if (typeof problem.title === 'string' && problem.title.trim()) {
      return problem.title;
    }
  }

  return `Request failed (HTTP ${status}).`;
}

async function request<T>(
  path: string,
  options: RequestInit,
  authenticated: boolean,
): Promise<T> {
  const url = endpoint(path);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (authenticated) {
    const token = await tokenStore.get();

    if (!token) {
      throw new ApiError(401, 'Sign in to continue.');
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit',
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    throw new Error(
      'Could not reach the API. Check your connection and try again.',
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (response.ok) {
      throw new ApiError(502, 'The API returned an invalid JSON response.');
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(body, response.status));
  }

  return body as T;
}

/** Exchanges the provider code without attaching an existing app JWT. */
export function exchangeGitHubCode(
  input: GitHubLoginInput,
): Promise<GitHubLoginResult> {
  return request<GitHubLoginResult>(
    '/auth/github',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    false,
  );
}

/** Loads the current account using the stored app JWT. */
export function getMe(): Promise<AppUser> {
  return request<AppUser>('/me', { method: 'GET' }, true);
}

/** Catalog fields shared by public browsing and the admin directory. */
export interface CatalogPart {
  part_id: string;
  category: string;
  name: string;
  price: number | null;
  created_at: string;
}

/** A bounded database page using the OpenAPI pagination contract. */
export interface DirectoryPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Parameters shared by both read-only directories. */
export interface DirectoryRequest {
  q: string;
  page: number;
  size?: number;
  signal?: AbortSignal;
}

/** Encodes search terms so literal punctuation cannot become URL parameters. */
function directoryPath(path: string, { q, page, size = 10 }: DirectoryRequest): string {
  return `${path}?${new URLSearchParams({ q: q.trim(), page: String(page), size: String(size) })}`;
}

/** Loads private account data with the app bearer token and no HTTP cache. */
export function getAdminUsers(input: DirectoryRequest): Promise<DirectoryPage<AppUser>> {
  return request(directoryPath('/admin/users', input), { method: 'GET', cache: 'no-store', signal: input.signal }, true);
}

/** Searches the public catalog without attaching private account credentials. */
export function getCatalogParts(input: DirectoryRequest): Promise<DirectoryPage<CatalogPart>> {
  return request(directoryPath('/parts', input), { method: 'GET', signal: input.signal }, false);
}
