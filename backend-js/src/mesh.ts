import { ForwardType, type AppConfig } from "./config"
import WebSocket, { WebSocketServer } from "ws"

export async function setupMesh(config: AppConfig): Promise<void> {
  const allNodeConnections = []
  // If node is defined and not empty, subnodes can connect to this.
  if (config.node?.length) {
    // as central
    const wss = new WebSocketServer({
      port: config.port,
      path: "/ws",
    })
  }
  // If central is defined and not empty, it will try connecting to every central.
  if (config.central?.length && config.publicKey && config.privateKey) {
    // as node
    for (const central of config.central) {
      const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
      const handler = new AsNodeHandler(ws, {
        publicKey: config.publicKey,
        privateKey: config.privateKey,
        server: central.server,
        forward: central.forward,
      })
      handler.init()
    }
  }
}
interface AsNodeOptions {
  publicKey: string
  privateKey: string
  server: string
  forward: string
}
class AsNodeHandler {
  readonly ws: WebSocket
  readonly options: AsNodeOptions
  constructor(ws: WebSocket, options: AsNodeOptions) {
    this.ws = ws
    this.options = options
  }
  init(): void {
    if (this.options.forward === ForwardType.redirect) {

    } else if (this.options.forward === ForwardType.socket) {

    }
  }
}

class AsCentralHandler {
  readonly wss: WebSocketServer
  constructor(wss: WebSocketServer) {
    this.wss = wss
  }
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
