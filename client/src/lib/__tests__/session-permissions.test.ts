import { ApiError, type AppUser } from '../api';
import { Session } from '../session';

const admin: AppUser = { id: 'id', email: 'admin@example.test', display_name: null, role: 'ADMIN', created_at: '2026-01-01T00:00:00Z' };

test('refresh picks up database demotion without another OAuth login', async () => {
  const getMe = jest.fn().mockResolvedValueOnce(admin).mockResolvedValueOnce({ ...admin, role: 'USER' });
  const store = { get: jest.fn().mockResolvedValue('token'), set: jest.fn(), clear: jest.fn() };
  const session = new Session({ store, getMe, exchange: jest.fn() });
  await session.restore();
  expect(session.getSnapshot().user?.role).toBe('ADMIN');
  await session.refresh();
  expect(session.getSnapshot().user?.role).toBe('USER');
  expect(store.clear).not.toHaveBeenCalled();
});

test('expired sessions clear token storage and private identity', async () => {
  const getMe = jest.fn().mockResolvedValueOnce(admin).mockRejectedValueOnce(new ApiError(401, 'Expired'));
  const store = { get: jest.fn().mockResolvedValue('token'), set: jest.fn(), clear: jest.fn().mockResolvedValue(undefined) };
  const session = new Session({ store, getMe, exchange: jest.fn() });
  await session.restore();
  await session.refresh();
  expect(store.clear).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot().user).toBeNull();
});

test('ending a session prevents an earlier refresh from restoring its private identity', async () => {
  let complete: (value: AppUser) => void = () => undefined;
  const pending = new Promise<AppUser>((resolve) => { complete = resolve; });
  const getMe = jest.fn().mockResolvedValueOnce(admin).mockReturnValueOnce(pending);
  const store = { get: jest.fn().mockResolvedValue('token'), set: jest.fn(), clear: jest.fn().mockResolvedValue(undefined) };
  const session = new Session({ store, getMe, exchange: jest.fn() });
  await session.restore();
  const refreshing = session.refresh();
  await session.expire();
  complete(admin);
  await refreshing;
  expect(session.getSnapshot().user).toBeNull();
});
