import { ForwardType } from "./config.js"
import type { MeshAsNodeConfig, MeshAsCentralConfig, AppConfig, CentralConfig, ForwardConfig } from "./config.js"
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
type NodeMeta = {
  name: string
  forward: ForwardType
  passcode?: string
} & ForwardConfig

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
type MessageHandler = (data: Buffer) => Promise<void>
function EmptyState(log: Logger): MessageHandler {
  return async (data) => {
    log.info("[Empty State]", data.toString())
  }
}

enum ChallengeResult {
  success = "success",
  failure = "failure",
}

enum NodeMetaResult {
  passcodeConflict = "passcodeConflict",
  success = "success",
}

function createAsCentralStateMachine(
  ws: WebSocket,
  log: Logger,
  config: MeshAsCentralConfig,
): { state: MessageHandler } {
  const sm = {
    state: AuthState()
  }
  function AuthState(): MessageHandler {
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
        if (payload.resolved !== challenge) {
          log.info(`"${publicKey}" challenge failed.`)
          ws.send(JSON.stringify({
            result: ChallengeResult.failure,
          }))
          ws.close()
          return
        }
        log.info(`"${publicKey}" is authenticated.`)
        ws.send(JSON.stringify({
          result: ChallengeResult.success,
        }))
        sm.state = GetNodeMetaState()
      }
    }
  }
  function GetNodeMetaState(): MessageHandler {
    return async (data) => {
      const dataText = data.toString()
      const nodeMeta: NodeMeta = JSON.parse(dataText)
      log.info(`Receieved node meta "${dataText}".`)
      // If the node has passcode and it doesn't match this central's passcode, then report an error
      if (nodeMeta.passcode && nodeMeta.passcode !== config.passcode) {
        ws.send(JSON.stringify({
          result: NodeMetaResult.passcodeConflict,
        }))
        log.info(`Node[${nodeMeta.name}] conflicts with this passcode.`)
        ws.close()
        return
      }
      sm.state = EmptyState(log)
    }
  }
  return sm
}

export async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const sm = createAsNodeStateMachine(ws, log, central, config)
    ws.on("open", () => {
      log.info(`Connected to ${central.server}.`)
      ws.send(JSON.stringify({
        publicKey: config.publicKey
      }))
    })
    ws.on("close", () => {
      log.info(`Disconnected from ${central.server}.`)
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
    state: ResolveChallengeState()
  }
  function ResolveChallengeState(): MessageHandler {
    return async (data) => {
      const { challenge, publicKey, nonce } = JSON.parse(data.toString())
      const encrypted = Buffer.from(challenge, "base64")
      const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
      if (resolved === null) {
        log.error("challenge failed.")
        ws.close()
        return
      }
      log.info(`Resolved challenge "${resolved}" from ${central.server}.`)
      ws.send(JSON.stringify({
        resolved
      }))
      sm.state = AwaitChallengeResultState()
    }
  }
  function AwaitChallengeResultState(): MessageHandler {
    return async (data) => {
      const { result }: { result: ChallengeResult } = JSON.parse(data.toString())
      if (result !== ChallengeResult.success) {
        log.error("challenge failed.")
        ws.close()
        return
      }
      log.info(`Authenticated on ${central.server}.`)
      let nodeMeta: NodeMeta
      if (central.forward === ForwardType.socket) {
        nodeMeta = {
          name: config.name,
          forward: central.forward,
          passcode: config.passcode,
        }
      } else { // redirect
        nodeMeta = {
          name: config.name,
          forward: ForwardType.redirect,
          redirectTo: central.redirectTo,
          passcode: config.passcode,
        }
      }
      ws.send(JSON.stringify(nodeMeta))
      sm.state = AwaitNodeMetaState()
    }
  }
  function AwaitNodeMetaState(): MessageHandler {
    return async (data) => {
      const { result }: { result: NodeMetaResult } = JSON.parse(data.toString())
      if (result === NodeMetaResult.success) {
        sm.state = EmptyState(log)
      } else if (result === NodeMetaResult.passcodeConflict) {
        log.error(`Passcode is conflict with the central "${central.server}"`)
        ws.close()
      }
    }
  }
  return sm
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

function castUint8Array(raw: string | Uint8Array, encoding?: BufferEncoding): Uint8Array {
  return raw instanceof Uint8Array ? raw : Buffer.from(raw, encoding)
}

function encrypt(
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

function decrypt(
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
