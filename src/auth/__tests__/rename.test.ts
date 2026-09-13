// AsyncStorage and expo-crypto are native modules; the local backend only
// needs them to be a key/value store and a hash, so stub both.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        store.delete(key);
        return Promise.resolve();
      },
    },
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(n).fill(7),
  digestStringAsync: (_algorithm: string, value: string) => Promise.resolve(`hash:${value}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

import { register, renameAccount, login } from '../storage';
import { AuthError } from '../authError';

describe('renameAccount', () => {
  it('renames the account and lets the player log in under the new name', async () => {
    const created = await register('hero', 'password');
    const renamed = await renameAccount(created.id, '  senpai  ');

    expect(renamed.username).toBe('senpai');
    expect(renamed.id).toBe(created.id);
    await expect(login('senpai', 'password')).resolves.toMatchObject({ id: created.id });
    await expect(login('hero', 'password')).rejects.toThrow(AuthError);
  });

  it('rejects a name another account already holds, whatever its casing', async () => {
    const mine = await register('taken_by_me', 'password');
    await register('RivalName', 'password');

    await expect(renameAccount(mine.id, 'rivalname')).rejects.toMatchObject({ code: 'usernameTaken' });
  });

  it('allows re-casing your own name', async () => {
    const created = await register('lowercase', 'password');
    await expect(renameAccount(created.id, 'LowerCase')).resolves.toMatchObject({ username: 'LowerCase' });
  });

  it('rejects a name that is too short or too long', async () => {
    const created = await register('validname', 'password');
    await expect(renameAccount(created.id, 'ab')).rejects.toMatchObject({ code: 'usernameTooShort' });
    await expect(renameAccount(created.id, 'x'.repeat(21))).rejects.toMatchObject({ code: 'usernameTooLong' });
  });
});
