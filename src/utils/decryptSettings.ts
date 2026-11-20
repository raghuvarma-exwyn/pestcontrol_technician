import { payloadToBytes } from "./payloadCodec";

const SETTINGS_RESPONSE_KEY = "730260b9be49c471d91b5c11c44500ac";

async function deriveAesKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SETTINGS_RESPONSE_KEY)
  );
  if (digest.byteLength !== 32) {
    throw new Error("Settings key is not AES-256");
  }
  return crypto.subtle.importKey("raw", digest, { name: "AES-CBC" }, false, [
    "decrypt",
  ]);
}

export async function decryptSettings<T = unknown>(
  encryptedData: string
): Promise<T> {
  const raw = payloadToBytes(encryptedData);
  if (raw.byteLength < 17) {
    throw new Error("Unable to decrypt settings");
  }

  const iv = raw.slice(0, 16);
  const ciphertext = raw.slice(16);
  const key = await deriveAesKey();

  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      ciphertext
    );
  } catch {
    throw new Error("Unable to decrypt settings");
  }

  const json = new TextDecoder().decode(plain);
  if (!json) {
    throw new Error("Unable to decrypt settings");
  }

  return JSON.parse(json) as T;
}

export async function parseSettingsList(data: unknown): Promise<any[]> {
  if (Array.isArray(data)) return data;
  if (typeof data === "string" && data.trim()) {
    const decrypted = await decryptSettings<any>(data);
    return Array.isArray(decrypted) ? decrypted : [];
  }
  return [];
}
