/* eslint-disable @typescript-eslint/no-misused-promises */
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import nacl from "tweetnacl"
import { Net } from "./net.js"
import { type File, type FileTreeLike, type FileTree, type FileTreeJson, type FileTreeJsonEntry } from "./file.js"
import "./netx.js"
export enum ForwardType {
  socket = "socket",
  redirect = "redirect",
}

export type CentralConfig = {
  server: string
  forward: ForwardType
} & ForwardConfig

export type ForwardConfig = {
  forward: ForwardType.socket
} | {
  forward: ForwardType.redirect
  redirectTo: string
}

export interface MeshAsCentralConfig {
  name: string
  port: number
  /**
   * The public key of node.
   */
  node: string[]
  publicKey: string
  privateKey: string
  passcode?: string
}

export interface MeshAsNodeConfig {
  name: string
  central: CentralConfig[]
  publicKey: string
  privateKey: string
  passcode?: string
}

type NodeMeta = {
  name: string
  forward: ForwardType
  passcode?: string
} & ForwardConfig

class MeshTree implements FileTreeLike {
  nodes: Record<string, FileTreeJsonEntry> = {}

  resolveFile(filePath: string): File | null {
    return null
  }
  getFileTreeOfNode(nodeName: string) {

  }
  getMetaList(): string[] {
    return []
  }
}

export async function setupAsCentral(config: MeshAsCentralConfig, server?: any): Promise<void> {
  const log = createLogger("Central")
  // as central
  const wss = new WebSocketServer({
    server,
    port: server ? undefined : config.port,
    path: "/ws",
  })
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  wss.on("connection", async (ws: WebSocket) => {
    const net = new Net(ws)
    net.debug = (id, message) => {
      log.debug(id, message)
    }
    net.startDaemonWatch()
    log.trace("A websocket is established.")
    ws.on("error", (error) => { log.error(error) })
    ws.on("close", () => {
      log.trace("A websocket is closed.")
    })
    ws.on("message", (data) => {
      net.handleReceivedData(data as Buffer)
    })
    const nodeMeta = await authenticateNodeAsCentral(net, log, config)
    if (!nodeMeta) return
    net.addBubbleHook(config.name, (id, arr) => {
      if (id !== "file-tree-rebuild") return
      log.info(arr)
    })
  })
}
export interface NodeBehavior {
  onLocalFileTreeRebuild: (id: string, listener: (
    { json, jsonString, tree }: { json: FileTreeJson, jsonString: string, tree: FileTree }
  ) => void) => void
  offListeners: (id?: string) => void
}

export async function setupAsNode(
  config: MeshAsNodeConfig,
  behavior: NodeBehavior
): Promise<void> {
  const name2Central = {}
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const net = new Net(ws)
    net.debug = (id, message) => {
      log.debug(id, message)
    }
    let isConnected = false
    net.startDaemonWatch()
    let centralInfo: CentralInfo | undefined
    ws.on("error", (error) => { log.error(error) })
    ws.on("open", async () => {
      isConnected = true
      log.info(`Connected to ${central.server}.`)
      centralInfo = await authenticateAsNode(net, log, central, config)
      if (!centralInfo) return
      name2Central[centralInfo.name] = net
      behavior.onLocalFileTreeRebuild(centralInfo.name, ({ jsonString }) => {
        net.sendBubble("file-tree-rebuild", config.name, [jsonString])
      })
    })
    ws.on("close", () => {
      if (!isConnected) return
      if (centralInfo) {
        behavior.offListeners(centralInfo.name)
      }
      log.info(`Disconnected from ${central.server}.`)
    })
    ws.on("message", (data) => {
      net.handleReceivedData(data as Buffer)
    })
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

async function authenticateNodeAsCentral(
  net: Net,
  log: Logger,
  config: MeshAsCentralConfig,
): Promise<NodeMeta | undefined> {
  const nonce = nacl.randomBytes(24)
  const challenge = Math.random().toString()
  const { publicKey }: { publicKey: string } = await net.getJson("auth-public-key")
  log.trace(publicKey)
  if (!config.node.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
  log.info(`"${publicKey}" is challenging with "${challenge}".`)
  const challengeEncrypted = encrypt(challenge, nonce, publicKey, config.privateKey)
  net.sendJson("auth-challenge", {
    name: config.name,
    challenge: challengeEncrypted,
    nonce: Buffer.from(nonce).toString("base64"),
    publicKey: config.publicKey,
  })
  const { resolved } = await net.getJson("auth-challenge-solution")
  if (resolved !== challenge) {
    log.info(`"${publicKey}" challenge failed.`)
    net.sendJson("auth-challenge-solution-result", {
      result: ChallengeResult.failure,
    })
    net.close()
    return
  }
  log.info(`"${publicKey}" is authenticated.`)
  net.sendJson("auth-challenge-solution-result", {
    result: ChallengeResult.success,
  })
  const nodeMeta: NodeMeta = await net.getJson("node-meta")
  log.info(`Receieved node meta "${JSON.stringify(nodeMeta)}".`)
  // If the node has passcode and it doesn't match this central's passcode, then report an error
  if (nodeMeta.passcode && nodeMeta.passcode !== config.passcode) {
    net.sendJson("node-meta-result", {
      result: NodeMetaResult.passcodeConflict,
    })
    log.info(`Node[${nodeMeta.name}] conflicts with this passcode.`)
    net.close()
    return
  }
  return nodeMeta
}
interface CentralInfo {
  name: string
}
async function authenticateAsNode(
  net: Net,
  log: Logger,
  central: CentralConfig,
  config: MeshAsNodeConfig,
): Promise<CentralInfo | undefined> {
  net.sendJson("auth-public-key", {
    publicKey: config.publicKey
  })
  const { name, challenge, publicKey, nonce } = await net.getJson("auth-challenge")
  const encrypted = Buffer.from(challenge, "base64")
  const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
  if (resolved === null) {
    log.error("challenge failed.")
    net.close()
    return
  }
  log.info(`Resolved challenge "${resolved}" from ${central.server}.`)
  net.sendJson("auth-challenge-solution", {
    resolved
  })
  const challengeResultPayload: { result: ChallengeResult } = await net.getJson("auth-challenge-solution-result")
  if (challengeResultPayload.result !== ChallengeResult.success) {
    log.error("challenge failed.")
    net.close()
    return
  }
  log.info(`Authenticated on ${central.server}.`)
  let nodeMeta: NodeMeta
  if (central.forward === ForwardType.socket) {
    nodeMeta = {
      name: config.name,
      forward: central.forward,
    }
  } else { // redirect
    nodeMeta = {
      name: config.name,
      forward: ForwardType.redirect,
      redirectTo: central.redirectTo,
      passcode: config.passcode,
    }
  }
  net.sendJson("node-meta", nodeMeta)
  const nodeMetaResultPayload: { result: NodeMetaResult } = await net.getJson("node-meta-result")
  if (nodeMetaResultPayload.result === NodeMetaResult.passcodeConflict) {
    log.error(`Passcode is conflict with the central "${central.server}"`)
    net.close()
    return
  }
  return {
    name,
  }
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
