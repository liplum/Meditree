import { ForwardType, type MeshAsNodeConfig, type MeshAsCentralConfig, type AppConfig } from "./config.js"
import WebSocket, { WebSocketServer } from "ws"
import { createLogger } from "./logger.js"
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
  const allNodeConnections = []
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
    const challenge = Math.random().toString()
    const nonce = nacl.randomBytes(24)
    let publicKey: string
    ws.on("message", (data) => {
      const payload = JSON.parse((data as Buffer).toString())
      console.log(payload)
      publicKey = payload.publicKey
      ws.send(JSON.stringify({
        challenge
      }))
    })
  })
}

class AsCentralStateMachine {

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
