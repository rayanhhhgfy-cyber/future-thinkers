/* Request signing for the Future Thinkers API.
 *
 * Every API call carries an HMAC-SHA256 signature so the backend can tell
 * genuine app traffic apart from scripted automation:
 *
 *   canonical = METHOD + "\n" + PATH + "\n" + TS + "\n" + NONCE + "\n" + SHA256HEX(bodyBytes)
 *   sig       = HMAC-SHA256(key, canonical) as hex
 *
 * PATH is the path only, starting with /api (no origin, no query). TS is
 * integer seconds. NONCE is 16 hex chars. Requests send the trio as
 * X-Ft-Ts / X-Ft-Nonce / X-Ft-Sig headers; plain media GETs (img tags, PDF
 * downloads) carry the same values as fts / fnonce / fsig query params.
 *
 * The signing key is the per-session key the server hands out in
 * login/register/me responses (stored as ft_sig_key), falling back to the
 * public client key below for anonymous traffic.
 *
 * SHA-256/HMAC are implemented here in pure JS (no dependencies) and are
 * verified against node:crypto test vectors.
 */

const enc = new TextEncoder();

function toBytes(input) {
  if (input == null) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  return enc.encode(String(input));
}

function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

/* ------------------------- pure JS SHA-256 ------------------------- */

const SHA_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(input) {
  const bytes = toBytes(input);
  const len = bytes.length;
  const bitLen = len * 8;
  const paddedLen = (((len + 8) >> 6) + 1) << 6;
  const msg = new Uint8Array(paddedLen);
  msg.set(bytes);
  msg[len] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000) >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Int32Array(64);

  for (let block = 0; block < paddedLen; block += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(block + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA_K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  const hs = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, hs[i] >>> 0);
  return out;
}

function sha256Hex(input) {
  return bytesToHex(sha256Bytes(input));
}

/* ------------------------- HMAC-SHA256 ------------------------- */

function hmacSha256Bytes(keyInput, msgInput) {
  let key = toBytes(keyInput);
  if (key.length > 64) key = sha256Bytes(key);
  const block = new Uint8Array(64);
  block.set(key);
  const msg = toBytes(msgInput);
  const inner = new Uint8Array(64 + msg.length);
  const outerPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    inner[i] = block[i] ^ 0x36;
    outerPad[i] = block[i] ^ 0x5c;
  }
  inner.set(msg, 64);
  const innerHash = sha256Bytes(inner);
  const outer = new Uint8Array(64 + innerHash.length);
  outer.set(outerPad);
  outer.set(innerHash, 64);
  return sha256Bytes(outer);
}

function hmacSha256Hex(key, msg) {
  return bytesToHex(hmacSha256Bytes(key, msg));
}

/* ------------------------- keys ------------------------- */

// Public client key, assembled from parts so it is not a single literal.
const APP_KEY = (() => {
  const parts = ["5c1284a1", "0540", "5feb0300", "eb6f"];
  const tail = String.fromCharCode(
    57, 49, 101, 49, 100, 55, 98, 102, 102, 100, 99, 52, 54, 52, 51, 102, 100, 101, 57, 54, 55, 53, 57, 50
  );
  return parts.join("") + tail;
})();

const SIG_KEY_STORAGE = "ft_sig_key";

function storage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function getSigKey() {
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(SIG_KEY_STORAGE) || null;
  } catch {
    return null;
  }
}

export function setSigKey(key) {
  if (!key || typeof key !== "string") return;
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SIG_KEY_STORAGE, key);
  } catch {}
}

export function clearSigKey() {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(SIG_KEY_STORAGE);
  } catch {}
}

function currentKey() {
  return getSigKey() || APP_KEY;
}

/* ------------------------- signing ------------------------- */

function makeNonce() {
  const bytes = new Uint8Array(8);
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

function canonicalFor(method, path, ts, nonce, bodyStr) {
  return `${String(method || "GET").toUpperCase()}\n${path}\n${ts}\n${nonce}\n${sha256Hex(bodyStr || "")}`;
}

function signValues(method, path, bodyStr) {
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = makeNonce();
  const sig = hmacSha256Hex(currentKey(), canonicalFor(method, path, ts, nonce, bodyStr));
  return { ts, nonce, sig };
}

/** Headers for an axios/fetch request against a full /api path. */
export function signHeaders(method, fullPath, bodyStr) {
  const { ts, nonce, sig } = signValues(method, fullPath, bodyStr);
  return { "X-Ft-Ts": ts, "X-Ft-Nonce": nonce, "X-Ft-Sig": sig };
}

/** Extract the signable /api path from a relative or absolute URL, or null. */
function apiPathOf(url) {
  if (!url || typeof url !== "string") return null;
  let path = url;
  if (/^https?:\/\//i.test(url)) {
    try {
      path = new URL(url).pathname;
    } catch {
      return null;
    }
  } else {
    path = url.split(/[?#]/)[0];
  }
  return path.startsWith("/api") ? path : null;
}

/**
 * Append the signature trio (fts/fnonce/fsig) to a media GET URL.
 * Absolute URLs outside /api (external hosts) are returned untouched.
 */
export function signUrl(url) {
  const path = apiPathOf(url);
  if (!path) return url;
  const { ts, nonce, sig } = signValues("GET", path, "");
  const hashIdx = url.indexOf("#");
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const frag = hashIdx >= 0 ? url.slice(hashIdx) : "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}fts=${ts}&fnonce=${nonce}&fsig=${sig}${frag}`;
}

export { sha256Hex, hmacSha256Hex, APP_KEY };

/* ============================ v2 (hardened) ============================
 *
 *   HourBucket = floor(tsMs / 3600000)
 *   RK         = HMAC-SHA512(key=L0, "rk:" + deviceId + ":" + HourBucket) hex
 *   canonical  = "V2\n" + METHOD + "\n" + PATH + "\n" + QUERY + "\n" + TSMS
 *                + "\n" + NONCE + "\n" + DEVICE + "\n" + SHA256HEX(body)
 *                + "\n" + SHA256HEX(contentType or "")
 *   sig        = HMAC-SHA512(key=RK, canonical) hex        (WebCrypto)
 *
 * L0 is the session sig_key when present, else APP_KEY. HMAC keys are the
 * UTF-8 bytes of those hex strings (same convention as v1). QUERY is the
 * canonical sorted query (see canonicalQuery). Headers: X-Ft-V "2",
 * X-Ft-Ts (milliseconds), X-Ft-Nonce (32 hex), X-Ft-Dev, X-Ft-Sig.
 * Session-signed requests also carry X-Ft-Esig: an ECDSA P-256 signature
 * (base64url r||s) over the same canonical string, made by a non-extractable
 * device key persisted in IndexedDB.
 */

const DEVICE_ID_STORAGE = "ft_device_id";
let _deviceIdCache = null;

function uuid() {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getDeviceId() {
  if (_deviceIdCache) return _deviceIdCache;
  const s = storage();
  if (s) {
    try {
      const existing = s.getItem(DEVICE_ID_STORAGE);
      if (existing) {
        _deviceIdCache = existing;
        return existing;
      }
    } catch {}
  }
  const id = uuid();
  _deviceIdCache = id;
  if (s) {
    try {
      s.setItem(DEVICE_ID_STORAGE, id);
    } catch {}
  }
  return id;
}

/* ------------------------- WebCrypto helpers ------------------------- */

function getSubtle() {
  try {
    return (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) || null;
  } catch {
    return null;
  }
}

async function hmacSha512Hex(keyStr, msgStr) {
  const subtle = getSubtle();
  if (!subtle) throw new Error("WebCrypto unavailable");
  const key = await subtle.importKey(
    "raw", enc.encode(String(keyStr)), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, enc.encode(String(msgStr)));
  return bytesToHex(new Uint8Array(sig));
}

/** Hour-bucketed request key derived from the long-lived key L0. */
export async function deriveRk(l0, deviceId, bucket) {
  return hmacSha512Hex(l0, `rk:${deviceId}:${bucket}`);
}

function makeNonce32() {
  const bytes = new Uint8Array(16);
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

/** Canonical sorted query: "k=v" pairs sorted by (key, value), raw-joined. */
export function canonicalQuery(url, params) {
  const pairs = [];
  const push = (k, v) => {
    const key = String(k);
    if (key === "fts" || key === "fnonce" || key === "fsig") return;
    pairs.push([key, String(v)]);
  };
  if (url) {
    const s = String(url);
    const qi = s.indexOf("?");
    if (qi >= 0) {
      const qs = s.slice(qi + 1).split("#")[0];
      try {
        new URLSearchParams(qs).forEach((v, k) => push(k, v));
      } catch {}
    }
  }
  if (params && typeof params === "object") {
    for (const k of Object.keys(params)) {
      const v = params[k];
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) {
        for (const el of v) {
          if (el !== null && el !== undefined) push(k, el);
        }
      } else {
        push(k, v);
      }
    }
  }
  pairs.sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
  );
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

export function buildCanonicalV2({ method, path, query, ts, nonce, device, bodyStr, contentType }) {
  return (
    `V2\n${String(method || "GET").toUpperCase()}\n${path}\n${query || ""}\n${ts}\n${nonce}\n${device}\n` +
    `${sha256Hex(bodyStr || "")}\n${sha256Hex(contentType || "")}`
  );
}

/**
 * Sign one request the v2 way. Returns { headers, canonical } · the
 * canonical string is handed back so the caller can ECDSA-sign it too.
 */
export async function signRequestV2({ method, path, query, bodyStr, contentType }) {
  const ts = String(Date.now());
  const bucket = Math.floor(Number(ts) / 3600000);
  const device = getDeviceId();
  const rk = await deriveRk(currentKey(), device, bucket);
  const nonce = makeNonce32();
  const canonical = buildCanonicalV2({
    method, path, query: query || "", ts, nonce, device,
    bodyStr: bodyStr || "", contentType: contentType || "",
  });
  const sig = await hmacSha512Hex(rk, canonical);
  return {
    canonical,
    headers: {
      "X-Ft-V": "2",
      "X-Ft-Ts": ts,
      "X-Ft-Nonce": nonce,
      "X-Ft-Dev": device,
      "X-Ft-Sig": sig,
    },
  };
}

/* ------------------- ECDSA device key (IndexedDB) ------------------- */

let _devPair = null;
let _devPub = null;
let _devPairPromise = null;

function idbOpen() {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const rq = indexedDB.open("ft-sig", 1);
      rq.onupgradeneeded = () => {
        try { rq.result.createObjectStore("keys"); } catch {}
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const rq = db.transaction("keys").objectStore("keys").get(key);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(key, value) {
  const db = await idbOpen();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function b64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Load (or create once) the ECDSA P-256 device keypair. The private key is
 * non-extractable and lives only in IndexedDB. Resolves the public JWK
 * {x, y}, or null when WebCrypto/IndexedDB are unavailable.
 */
export async function ensureDeviceKey() {
  if (_devPub) return _devPub;
  if (_devPairPromise) return _devPairPromise;
  _devPairPromise = (async () => {
    try {
      const subtle = getSubtle();
      if (!subtle) return null;
      // No IndexedDB means the private key could not persist · stay silent.
      if (typeof indexedDB === "undefined") return null;
      let pair = await idbGet("device");
      if (!pair) {
        pair = await subtle.generateKey(
          { name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]
        );
        await idbPut("device", pair);
      }
      _devPair = pair;
      const jwk = await subtle.exportKey("jwk", pair.publicKey);
      _devPub = { x: jwk.x, y: jwk.y };
      return _devPub;
    } catch {
      _devPairPromise = null;
      return null;
    }
  })();
  return _devPairPromise;
}

async function peekDevicePair() {
  if (_devPair) return _devPair;
  try {
    const pair = await idbGet("device");
    if (pair) {
      _devPair = pair;
      return pair;
    }
  } catch {}
  return null;
}

/** ECDSA-sign a canonical string · base64url(r||s), or null when no key. */
export async function signEcDSA(canonical) {
  try {
    const subtle = getSubtle();
    if (!subtle) return null;
    const pair = await peekDevicePair();
    if (!pair) return null;
    const raw = await subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, enc.encode(String(canonical))
    );
    return b64url(new Uint8Array(raw));
  } catch {
    return null;
  }
}

let _registeredForKey = null;
let _registerInFlight = false;

/**
 * Register this device's public key with the backend, once per session
 * key. apiPost(path, body) should return a promise. Fire-and-forget safe.
 */
export async function registerDeviceKey(apiPost) {
  try {
    const sk = getSigKey();
    if (!sk || typeof apiPost !== "function") return false;
    if (_registeredForKey === sk || _registerInFlight) return false;
    const pub = await ensureDeviceKey();
    if (!pub) return false;
    _registerInFlight = true;
    await apiPost("/auth/device-key", {
      device_id: getDeviceId(),
      public_key: { x: pub.x, y: pub.y },
    });
    _registeredForKey = sk;
    _registerInFlight = false;
    return true;
  } catch {
    _registerInFlight = false;
    return false;
  }
}

/* ------------------------------ PoW ------------------------------ */

/**
 * Proof of work for the auth endpoints: find a 16-hex nonce whose
 * SHA256(`${ts}.${deviceId}.${nonce}.${path}`) starts with "0000".
 */
export async function solvePow(ts, deviceId, path) {
  let counter = Math.floor(Math.random() * 0xffffffff);
  for (;;) {
    counter = (counter + 1) >>> 0;
    const nonce = counter.toString(16).padStart(8, "0") + makeNonce().slice(0, 8);
    const digest = sha256Hex(`${ts}.${deviceId}.${nonce}.${path}`);
    if (digest.startsWith("0000")) return nonce;
  }
}

export { hmacSha512Hex };
