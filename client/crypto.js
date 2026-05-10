// Generate a fresh public/private key pair for this session
async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  )
  return keyPair
}

// Export public key to a string so we can share it over the network
async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey('spki', publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

// Import a public key string back into a usable key object
async function importPublicKey(base64Key) {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  )
}

// Encrypt a message using someone's public key
async function encryptMessage(message, publicKey) {
  const encoded = new TextEncoder().encode(message)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, encoded)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

// Decrypt a message using your own private key
async function decryptMessage(base64Data, privateKey) {
  const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, binary)
  return new TextDecoder().decode(decrypted)
}