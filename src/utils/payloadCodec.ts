/** Decode a transport-encoded binary string (RFC 4648 alphabet) to bytes. */
export function payloadToBytes(payload: string): Uint8Array {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const cleaned = payload
    .replace(/[\r\n\s]/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "=") break;
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(out);
}
