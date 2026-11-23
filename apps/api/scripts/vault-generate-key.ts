import { generateVaultKey } from '../Utils/vault_crypto';

const newKey = generateVaultKey();
console.log('Generated 256-bit AES-GCM Vault Key (base64):');
console.log(newKey);
console.log('\nTo use this key, add it to your VAULT_ENCRYPTION_KEYS JSON map:');
console.log(`VAULT_ENCRYPTION_KEYS='{"1":"${newKey}"}'`);
console.log('VAULT_KEY_VERSION=1');
