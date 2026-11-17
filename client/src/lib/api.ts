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
    if (response.ok && response.status !== 204) {
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

/** Summary fields returned for one of the signed-in user's saved builds. */
export interface SavedBuild {
  build_id: string;
  user_id: string;
  name: string;
  budget: number | null;
  total_price: number;
  created_at: string;
}

/** A saved build detail, including its current selected parts. */
export interface SavedBuildDetail {
  id: string;
  name: string;
  budget: number | null;
  parts: Array<CatalogPart & { quantity: number }>;
  createdAt: string;
}

/** Fields saved when finalizing a new build or updating an existing one. */
export interface SavedBuildInput {
  name: string;
  budget: number | null;
  parts: Array<{ partId: string; quantity: number }>;
}

/** Parameters shared by both read-only directories. */
export interface DirectoryRequest {
  q: string;
  page: number;
  size?: number;
  signal?: AbortSignal;
}

/** Optional category filter accepted by the public catalog route. */
export interface CatalogRequest extends DirectoryRequest {
  category?: string;
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
export function getCatalogParts(input: CatalogRequest): Promise<DirectoryPage<CatalogPart>> {
  const params = new URLSearchParams({
    q: input.q.trim(),
    page: String(input.page),
    size: String(input.size ?? 10),
  });
  if (input.category) params.set('category', input.category);
  return request(`/parts?${params.toString()}`, { method: 'GET', signal: input.signal }, false);
}

/** Loads the current user's paginated builds, optionally filtered by name. */
export function getSavedBuilds(input: DirectoryRequest): Promise<DirectoryPage<SavedBuild>> {
  return request(directoryPath('/builds', input), { method: 'GET', signal: input.signal }, true);
}

/** Loads a saved build's selected parts before opening it for editing. */
export function getSavedBuild(id: string): Promise<SavedBuildDetail> {
  return request(`/builds/${encodeURIComponent(id)}`, { method: 'GET' }, true);
}

/** Creates a named saved build for the signed-in user. */
export function createSavedBuild(input: SavedBuildInput): Promise<SavedBuildDetail> {
  return request('/builds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, true);
}

/** Updates an existing saved build owned by the signed-in user. */
export function updateSavedBuild(id: string, input: SavedBuildInput): Promise<SavedBuildDetail> {
  return request(`/builds/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, true);
}

/** Admin user fields may be edited without granting access to change account roles. */
export interface UpdateAdminUserInput {
  email: string;
  displayName: string | null;
}

/** Editable catalog fields used for creating and updating a part. */
export interface AdminPartInput {
  category: string;
  name: string;
  price: number | null;
}

/** Updates an account's email and display name. The server retains the current role. */
export function updateAdminUser(id: string, input: UpdateAdminUserInput): Promise<AppUser> {
  return request(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }, true);
}

/** Deletes an account by its public identifier. */
export function deleteAdminUser(id: string): Promise<void> {
  return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
}

/** Creates a catalog part. */
export function createAdminPart(input: AdminPartInput): Promise<CatalogPart> {
  return request('/parts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }, true);
}

/** Updates editable catalog fields. */
export function updateAdminPart(id: string, input: AdminPartInput): Promise<CatalogPart> {
  return request(`/parts/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }, true);
}

/** Deletes a catalog part by its public identifier. */
export function deleteAdminPart(id: string): Promise<void> {
  return request(`/parts/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
}

/** Updates the signed-in user's profile display name. */
export function updateProfile(displayName: string): Promise<AppUser> {
  return request<AppUser>(
    '/me',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    },
    true,
  );
}

/** Deletes the signed-in user's account. */
export function deleteAccount(): Promise<void> {
  return request<void>('/me', { method: 'DELETE' }, true);
}
