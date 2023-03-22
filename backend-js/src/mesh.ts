import { ForwardType } from "./config.js"
import type { MeshAsNodeConfig, MeshAsCentralConfig, AppConfig, CentralConfig } from "./config.js"
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import nacl from "tweetnacl"

export async function setupMesh(config: AppConfig): Promise<void> {
  // If node is defined and not empty, subnodes can connect to this.
  if (config.central?.length && config.publicKey && config.privateKey) {
    setupAsCentral(config as any as MeshAsCentralConfig)
  }
  // If central is defined and not empty, it will try connecting to every central.
  if (config.node?.length && config.publicKey && config.privateKey) {
    setupAsNode(config as any as MeshAsNodeConfig)
  }
}

export async function setupAsCentral(config: MeshAsCentralConfig): Promise<void> {
  const log = createLogger("Central")
  // as central
  const wss = new WebSocketServer({
    port: config.port,
    path: "/ws",
  })
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  wss.on("connection", (ws: WebSocket) => {
    ws.on("error", log.trace)
    ws.on("close", () => {
      log.trace("A websocket is closed.")
    })
    log.trace("A websocket is established.")
    const sm = createAsCentralStateMachine(ws, log, config)
    ws.on("message", (data) => {
      sm.state(data as Buffer)
        .catch(e => {
          log.trace(e)
          ws.close()
        })
    })
  })
}

function uint8ArrayOf(text: string, encoding?: BufferEncoding): Uint8Array {
  return Uint8Array.from(Buffer.from(text, encoding))
}

function tryConvertToUint8Array(raw: string | Uint8Array, encoding?: BufferEncoding): Uint8Array {
  return raw instanceof Uint8Array ? raw : uint8ArrayOf(raw, encoding)
}

function encrypt(
  plain: Uint8Array | string,
  nonce: Uint8Array | string,
  theirPublicKey: Uint8Array | string,
  myPrivateKey: Uint8Array | string
): string {
  const encrypted = nacl.box(
    tryConvertToUint8Array(plain),
    tryConvertToUint8Array(nonce, "base64"),
    tryConvertToUint8Array(theirPublicKey, "base64"),
    tryConvertToUint8Array(myPrivateKey, "base64"),
  )
  return Buffer.from(encrypted).toString("base64")
}

function decrypt(
  encrypted: Uint8Array | string,
  nonce: Uint8Array | string,
  theirPublicKey: Uint8Array | string,
  myPrivateKey: Uint8Array | string
): string | null {
  const decrypted = nacl.box.open(
    tryConvertToUint8Array(encrypted, "base64"),
    tryConvertToUint8Array(nonce, "base64"),
    tryConvertToUint8Array(theirPublicKey, "base64"),
    tryConvertToUint8Array(myPrivateKey, "base64"),
  )
  return decrypted === null ? null : Buffer.from(decrypted).toString()
}

type MessageHandler = (data: Buffer) => Promise<void>

function createAsCentralStateMachine(
  ws: WebSocket,
  log: Logger,
  config: MeshAsCentralConfig,
): { state: MessageHandler } {
  const sm = {
    state: createAuthState()
  }
  function createAuthState(): MessageHandler {
    const nonce = nacl.randomBytes(24)
    const nonceBase64 = Buffer.from(nonce).toString("base64")
    const challenge = Math.random().toString()
    let publicKey: string | undefined
    return async (data) => {
      if (!publicKey) {
        // state 1: waiting for public key from node
        const payload = JSON.parse(data.toString())
        log.trace(payload)
        publicKey = payload.publicKey
        if (!publicKey) throw new Error("public key not given.")
        if (!config.node.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
        log.info(`"${publicKey}" is challenging with "${challenge}".`)
        const challengeEncrypted = encrypt(challenge, nonce, publicKey, config.privateKey)
        ws.send(JSON.stringify({
          challenge: challengeEncrypted,
          nonce: nonceBase64,
          publicKey: config.publicKey,
        }))
      } else {
        // state 2: waiting for resolved challenge from node
        const payload = JSON.parse(data.toString())
        if (payload.resolved === challenge) {
          log.info(`"${publicKey}" is authenticated.`)
          sm.state = createEmptyState()
        } else {
          throw new Error("challenge failed.")
        }
      }
    }
  }
  function createEmptyState(): MessageHandler {
    return async (data) => { }
  }
  return sm
}

export async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const sm = createAsNodeStateMachine(ws, log, central, config)
    ws.on("open", () => {
      ws.send(JSON.stringify({
        publicKey: config.publicKey
      }))
    })
    ws.on("message", (data) => {
      sm.state(data as Buffer)
    })
  }
}

function createAsNodeStateMachine(
  ws: WebSocket,
  log: Logger,
  central: CentralConfig,
  config: MeshAsNodeConfig,
): { state: MessageHandler } {
  const sm = {
    state: createAuthState()
  }
  function createAuthState(): MessageHandler {
    return async (data) => {
      const { challenge, publicKey, nonce } = JSON.parse(data.toString())
      const encrypted = uint8ArrayOf(challenge, "base64")
      const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
      if (resolved !== null) {
        log.info(`Resolved challenge "${resolved}" from ${central.server}`)
        ws.send(JSON.stringify({
          resolved
        }))
      } else {
        throw new Error("challenge failed.")
      }
    }
  }
  return sm
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

function convertUrlToWs(mayBeUrl: string): string {
  if (mayBeUrl.startsWith("http://")) {
    return `ws://${removePrefix(mayBeUrl, "http://")}`
  } else if (mayBeUrl.startsWith("https://")) {
    return `wss://${removePrefix(mayBeUrl, "https://")}`
  } else {
    return `ws://${mayBeUrl}`
  }
}

function removePrefix(str: string, prefix: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length)
  }
  return str
}

function removeSuffix(str: string, suffix: string): string {
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length)
  }
  return str
}
