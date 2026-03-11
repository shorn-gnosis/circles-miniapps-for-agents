import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

function base64url(data) {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

export async function createAttestation(payload) {
  const privateKeyHex = process.env.ATTESTATION_PRIVATE_KEY;
  if (!privateKeyHex) throw new Error('ATTESTATION_PRIVATE_KEY not set');
  
  const privateKey = Buffer.from(privateKeyHex, 'hex');
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  const header = { alg: 'EdDSA', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload = {
    iss: 'circles-attestation-service',
    iat: now,
    exp: now + 365 * 24 * 60 * 60,
    ...payload,
  };
  
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const message = Buffer.from(`${headerB64}.${payloadB64}`);
  
  const signature = await ed.signAsync(message, privateKey);
  const signatureB64 = base64url(signature);
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export async function verifyAttestation(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  
  const [headerB64, payloadB64, signatureB64] = parts;
  const message = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = base64urlDecode(signatureB64);
  
  const payload = JSON.parse(base64urlDecode(payloadB64).toString());
  
  const publicKeyHex = process.env.ATTESTATION_PUBLIC_KEY;
  if (!publicKeyHex) throw new Error('ATTESTATION_PUBLIC_KEY not set');
  
  const publicKey = Buffer.from(publicKeyHex, 'hex');
  const valid = await ed.verifyAsync(signature, message, publicKey);
  
  if (!valid) throw new Error('Invalid signature');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Attestation expired');
  
  return payload;
}

export function generateKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  return ed.getPublicKeyAsync(privateKey).then(publicKey => ({
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex'),
  }));
}
