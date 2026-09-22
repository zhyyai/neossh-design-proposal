/**
 * NEOSSH Operator Authentication & Session Security Layer
 * Compatible with Edge Middleware and Node.js runtimes (using Web Crypto API).
 */

export const SESSION_COOKIE_NAME = "neossh_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getAccessKey(): string {
  return process.env.NEOSSH_ACCESS_KEY || "neossh-operator-access";
}

/**
 * Validates a submitted access key against the configured secret.
 */
export function isValidAccessKey(submittedKey: string): boolean {
  const expectedKey = getAccessKey();
  if (!submittedKey || !expectedKey) return false;
  return submittedKey === expectedKey;
}

/**
 * Generate HMAC-SHA256 signature for a session payload using Web Crypto API.
 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    enc.encode(message)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a signed session token: timestamp.signature
 */
export async function createSessionToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const secret = getAccessKey();
  const signature = await hmacSha256(`neossh:${timestamp}`, secret);
  return `${timestamp}.${signature}`;
}

/**
 * Verify a signed session token.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, submittedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Check TTL
  const now = Date.now();
  const ageMs = now - timestamp;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const secret = getAccessKey();
  const expectedSig = await hmacSha256(`neossh:${timestampStr}`, secret);
  return submittedSig === expectedSig;
}
