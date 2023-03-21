import { ForwardType, type MeshAsNodeConfig, type MeshAsCentralConfig, type AppConfig } from "./config.js"
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
    ws.on("close", (ws: WebSocket) => {
      log.trace("Websocket is disconnected.")
    })
    log.trace("Websocket is connected.")

    const sm = createAsCentralStateMachine(ws, log, config.node, config.publicKey, config.privateKey)
    ws.on("message", (data) => {
      try {
        sm.state(data as Buffer)
      } catch (e) {
        log.trace(e)
        ws.close()
      }
    })
  })
}

function uint8ArrayOf(text: string, encoding?: BufferEncoding): Uint8Array {
  return Uint8Array.from(Buffer.from(text, encoding))
}

type MessageHandler = (data: Buffer) => void

function createAsCentralStateMachine(
  ws: WebSocket,
  log: Logger,
  nodes: string[],
  myPublicKey: string,
  myPrivateKey: string
): { state: MessageHandler } {
  const sm = {
    state: createAuthState()
  }
  function createAuthState(): MessageHandler {
    const nonce = nacl.randomBytes(24)
    const nonceBase64 = Buffer.from(nonce).toString("base64")
    const myPublicKeyUint8 = Uint8Array.from(Buffer.from(myPublicKey, "base64"))
    const myPrivateKeyUint8 = Uint8Array.from(Buffer.from(myPrivateKey, "base64"))
    const challenge = Math.random().toString()
    let publicKey: string | undefined
    return (data) => {
      if (!publicKey) {
        // state 1: waiting for public key from node
        const payload = JSON.parse(data.toString())
        log.trace(payload)
        publicKey = payload.publicKey
        if (!publicKey) throw new Error("public key not given.")
        if (!nodes.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
        log.info(`${publicKey} is challenging with "${challenge}".`)
        const challengeEncrypted = nacl.box(
          uint8ArrayOf(challenge),
          nonce,
          uint8ArrayOf(publicKey, "base64"),
          myPrivateKeyUint8
        )
        ws.send(JSON.stringify({
          challenge: challengeEncrypted,
          nonce: nonceBase64,
          publicKey: myPrivateKey,
        }))
      } else {
        // state 2: waiting for chanllege from node
        const payload = JSON.parse(data.toString())
        if (payload.decrypted === challenge) {
          log.info(`${publicKey} is authenticated.`)
          sm.state = createEmptyState()
        } else {
          throw new Error("challenge failed.")
        }
      }
    }
  }
  function createEmptyState(): MessageHandler {
    return (data) => { }
  }
  return sm
}

export async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    ws.on("open", () => {
      ws.send(JSON.stringify({
        publicKey: config.publicKey
      }))
    })
  }
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
