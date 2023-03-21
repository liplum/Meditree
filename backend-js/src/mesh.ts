import { ForwardType, type MeshAsNodeConfig, type MeshAsCentralConfig, type AppConfig } from "./config"
import WebSocket, { WebSocketServer } from "ws"

export async function setupMesh(config: AppConfig): Promise<void> {
  // If node is defined and not empty, subnodes can connect to this.
  if (config.central?.length && config.publicKey && config.privateKey) {
    setupAsCentral(config as any as MeshAsCentralConfig)
  }
  // If central is defined and not empty, it will try connecting to every central.
  if (config.node?.length) {
    setupAsNode(config as any as MeshAsNodeConfig)
  }
}

async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    ws.emit("auth", {
      publicKey: config.publicKey
    })
  }
}

async function setupAsCentral(config: MeshAsCentralConfig): Promise<void> {
  const allNodeConnections = []
  // as central
  const wss = new WebSocketServer({
    port: config.port,
    path: "/ws",
  })
  wss.on("connection", (ws) => {
    const challenge = Math.random().toString()
    let publicKey: string
    ws.on("auth", (ws, data) => {
      publicKey = data.publicKey
      ws.emit("auth", {
        challenge
      })
    })
  })
}

function convertUrlToWs(mayBeUrl: string): string {
  if (mayBeUrl.startsWith("http://")) {
    return `$ws://${removePrefix(mayBeUrl, "http://")}`
  } else if (mayBeUrl.startsWith("https://")) {
    return `$wss://${removePrefix(mayBeUrl, "https://")}`
  } else {
    return `$ws://${mayBeUrl}`
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
