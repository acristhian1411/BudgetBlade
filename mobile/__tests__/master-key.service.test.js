import * as masterKey from '../services/master-key.service';

describe('master-key.service', () => {
  it('creates a wrapped master key and sets the session key', async () => {
    await masterKey.createWrappedMasterKey('password');

    expect(masterKey.getSessionMasterKeyHex()).toMatch(/^[0-9a-f]{64}$/);
    expect(await masterKey.hasWrappedMasterKey()).toBe(true);
  });

  it('serializes and decrypts JSON with the session key', async () => {
    await masterKey.createWrappedMasterKey('password');

    const payload = masterKey.serializeEncryptedJson({ hello: 'world', n: 42 });
    const decrypted = masterKey.decryptEncryptedJson(payload);
    expect(decrypted).toEqual({ hello: 'world', n: 42 });
  });

  it('bootstraps the session key from an existing wrapped key', async () => {
    await masterKey.createWrappedMasterKey('password');
    masterKey.clearSessionMasterKey();
    expect(masterKey.getSessionMasterKeyHex()).toBeNull();

    await masterKey.bootstrapMasterKeyForSession('password');
    expect(masterKey.getSessionMasterKeyHex()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws when unwrapping with the wrong password', async () => {
    await masterKey.createWrappedMasterKey('password');
    masterKey.clearSessionMasterKey();

    await expect(masterKey.bootstrapMasterKeyForSession('wrong')).rejects.toThrow();
  });

  it('rejects an invalid session master key', () => {
    expect(() => masterKey.setSessionMasterKeyHex('not-hex')).toThrow();
  });
});
