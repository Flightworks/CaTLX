type DeviceCredential = { id: Uint8Array<ArrayBuffer>; salt: Uint8Array<ArrayBuffer> };
type PrfResult = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

export class DeviceUnlockUnavailable extends Error {}

function canUseDeviceUnlock() {
  return typeof PublicKeyCredential !== 'undefined' && Boolean(navigator.credentials) && isSecureContext;
}

const random = () => crypto.getRandomValues(new Uint8Array(32));

function prfResult(credential: PublicKeyCredential) {
  return (credential.getClientExtensionResults() as PrfResult).prf;
}

async function encryptionKey(secret: ArrayBuffer, salt: Uint8Array<ArrayBuffer>) {
  const source = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({
    name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('CaTLX offline workspace'),
  }, source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function requestDeviceKey(device: DeviceCredential) {
  if (!canUseDeviceUnlock()) throw new DeviceUnlockUnavailable();
  const response = await navigator.credentials.get({
    publicKey: {
      challenge: random(),
      allowCredentials: [{ type: 'public-key', id: device.id }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: device.salt } } } as AuthenticationExtensionsClientInputs,
    },
  });
  if (!(response instanceof PublicKeyCredential)) throw new DeviceUnlockUnavailable();
  const secret = prfResult(response)?.results?.first;
  if (!secret) throw new DeviceUnlockUnavailable();
  return encryptionKey(secret, device.salt);
}

export async function registerDevice() {
  if (!canUseDeviceUnlock()) throw new DeviceUnlockUnavailable();
  const salt = random();
  const response = await navigator.credentials.create({
    publicKey: {
      challenge: random(),
      rp: { name: 'CaTLX' },
      user: { id: random(), name: 'CaTLX', displayName: 'CaTLX offline' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required',
      },
      attestation: 'none',
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  });
  if (!(response instanceof PublicKeyCredential)) throw new DeviceUnlockUnavailable();
  const prf = prfResult(response);
  if (!prf?.enabled && !prf?.results?.first) throw new DeviceUnlockUnavailable();
  const device = { id: new Uint8Array(response.rawId), salt };
  const key = prf.results?.first ? await encryptionKey(prf.results.first, salt) : await requestDeviceKey(device);
  return { credentialId: device.id, salt, key };
}
