import nacl from "tweetnacl"

function castUint8Array(raw: string | Uint8Array, encoding?: BufferEncoding): Uint8Array {
  return raw instanceof Uint8Array ? raw : Buffer.from(raw, encoding)
}

export function encrypt(
  plain: Uint8Array | string,
  nonce: Uint8Array | string,
  theirPublicKey: Uint8Array | string,
  myPrivateKey: Uint8Array | string
): string {
  const encrypted = nacl.box(
    castUint8Array(plain),
    castUint8Array(nonce, "base64"),
    castUint8Array(theirPublicKey, "base64"),
    castUint8Array(myPrivateKey, "base64"),
  )
  return Buffer.from(encrypted).toString("base64")
}

export function decrypt(
  encrypted: Uint8Array | string,
  nonce: Uint8Array | string,
  theirPublicKey: Uint8Array | string,
  myPrivateKey: Uint8Array | string
): string | null {
  const decrypted = nacl.box.open(
    castUint8Array(encrypted, "base64"),
    castUint8Array(nonce, "base64"),
    castUint8Array(theirPublicKey, "base64"),
    castUint8Array(myPrivateKey, "base64"),
  )
  return decrypted === null ? null : Buffer.from(decrypted).toString()
}

export function generateNonce(): Uint8Array {
  return nacl.randomBytes(24)
}
