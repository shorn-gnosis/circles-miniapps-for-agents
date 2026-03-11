import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

async function generateKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  console.log('Generated Ed25519 keypair for attestation service:\n');
  console.log('ATTESTATION_PRIVATE_KEY=' + Buffer.from(privateKey).toString('hex'));
  console.log('ATTESTATION_PUBLIC_KEY=' + Buffer.from(publicKey).toString('hex'));
  console.log('\nAdd these to your Vercel environment variables.');
}

generateKeypair();
