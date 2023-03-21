import { ForwardType, type MeshAsNodeConfig, type MeshAsCentralConfig, type AppConfig } from "./config.js"
import WebSocket, { WebSocketServer } from "ws"
import { createLogger } from "./logger.js"

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
    log.trace("Websocket is connected.")
    const challenge = Math.random().toString()
    let publicKey: string
    ws.on("auth", (ws, data) => {
      publicKey = data.publicKey
      ws.emit("auth", {
        challenge
      })
    })
  })
  wss.on("close", (ws: WebSocket) => {
    log.trace("Websocket is disconnected.")
  })
}

export async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    ws.emit("auth", {
      publicKey: config.publicKey
    })
  }
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
