import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const VIEWER_TOKEN_KEY = 'yomibiyori.viewerToken';
let cachedViewerHash: string | null = null;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

export const getViewerHash = async (): Promise<string> => {
  if (cachedViewerHash) {
    return cachedViewerHash;
  }

  let storedToken = await SecureStore.getItemAsync(VIEWER_TOKEN_KEY);
  if (!storedToken) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    storedToken = bytesToHex(randomBytes);
    await SecureStore.setItemAsync(VIEWER_TOKEN_KEY, storedToken);
  }

  cachedViewerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    storedToken,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  return cachedViewerHash;
};
