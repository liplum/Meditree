/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-misused-promises */
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import nacl from "tweetnacl"
import { v4 as uuidv4 } from "uuid"
import { Net, MessageType } from "./net.js"
import { type LocalFile, type FileTreeLike, type FileTree, type FileTreeJson, type File, type RemoteFile } from "./file.js"
import EventEmitter from "events"
import { type Readable } from "stream"
import fs from "fs"

class SubNode implements FileTreeLike {
  readonly name: string
  readonly net: Net
  tree: FileTreeJson
  constructor(name: string, net: Net) {
    this.name = name
    this.net = net
  }

  resolveFile(pathParts: string[]): RemoteFile | null {
    const full = pathParts.join("/")
    let cur: RemoteFile | FileTreeJson = this.tree
    while (pathParts.length > 0 && !cur.type) {
      const currentPart = pathParts.shift()
      if (currentPart === undefined) break
      cur = cur[currentPart]
    }
    if (cur.type) {
      cur.nodeName = this.name
      cur.remotePath = full
      return cur as RemoteFile
    } else {
      return null
    }
  }

  toJSON(): FileTreeJson {
    return this.tree
  }
}
export type RouteMsgCallback<Header = any> = (id: string, data: any, header: Header) => void
export declare interface MeditreeNode {
  on(event: "bubble-pass", listener: (id: string, data: any, header: BubbleHeader) => void): this
  on(event: "bubble-end", listener: (id: string, data: any, header: BubbleHeader) => void): this
  on(event: "tunnel-pass", listener: (id: string, data: any, header: TunnelHeader) => void): this
  on(event: "tunnel-end", listener: (id: string, data: any, header: TunnelHeader) => void): this
  on(event: "file-tree-update", listener: (name: string, tree: FileTreeJson) => void): this

  off(event: "bubble-pass", listener: (id: string, data: any, header: BubbleHeader) => void): this
  off(event: "bubble-end", listener: (id: string, data: any, header: BubbleHeader) => void): this
  off(event: "tunnel-pass", listener: (id: string, data: any, header: TunnelHeader) => void): this
  off(event: "tunnel-end", listener: (id: string, data: any, header: TunnelHeader) => void): this
  off(event: "file-tree-update", listener: (name: string, tree: FileTreeJson) => void): this

  emit(event: "bubble-pass", id: string, data: any, header: BubbleHeader): boolean
  emit(event: "bubble-end", id: string, data: any, header: BubbleHeader): boolean
  emit(event: "tunnel-pass", id: string, data: any, header: TunnelHeader): boolean
  emit(event: "tunnel-end", id: string, data: any, header: TunnelHeader): boolean
  emit(event: "file-tree-update", name: string, tree: FileTreeJson | FileTreeLike): boolean
}
export class MeditreeNode extends EventEmitter implements FileTreeLike {
  readonly name: string
  readonly name2Parent = new Map<string, Net>()
  readonly name2Child = new Map<string, SubNode>()
  readonly localTree: FileTreeLike
  constructor(name: string, localTree: FileTreeLike) {
    super()
    this.name = name
    this.localTree = localTree
  }

  resolveFile(pathParts: string[]): File | null {
    const nodeName = pathParts.shift()
    if (!nodeName) return null
    if (nodeName === this.name) {
      return this.localTree.resolveFile(pathParts)
    } else {
      const node = this.name2Child.get(nodeName)
      if (!node) return null
      return node.resolveFile(pathParts)
    }
  }

  async createReadStream(file: File, options?: BufferEncoding | any): Promise<Readable> {
    // if the file has a path, it's a local file
    if ("path" in file) {
      const localFile = file as LocalFile
      return fs.createReadStream(localFile.path, options)
    } else {
      const remoteFile = file as RemoteFile
      const node = this.name2Child.get(remoteFile.nodeName)
      if (!node) throw new Error(`Node[${remoteFile.nodeName}] not found.`)
      const path = remoteFile.remotePath
      const id = uuidv4()
      node.net.send("get-file", { path, options, id })
      const stream = await node.net.getMessage("get-file", (header) => header && header.id === id)
      return stream
    }
  }

  updateFileTreeFromSubNode(name: string, tree: FileTreeJson): void {
    const node = this.name2Child.get(name)
    if (!node) throw new Error(`Node[${name}] not found.`)
    node.tree = tree
    this.emit("file-tree-update", name, tree)
  }

  toJSON(): FileTreeJson {
    const obj: FileTreeJson = {}
    for (const [name, node] of this.name2Child.entries()) {
      if (node.tree) {
        obj[name] = node.tree
      }
    }
    obj[this.name] = this.localTree.toJSON()
    return obj
  }

  attachHooks(net: Net): void {
    net.addReadHook(({ type, id, data, header }) => {
      if (type !== MessageType.object) return
      if (!header || header.type !== "bubble") return
      this.receiveBubble(id, data, header as BubbleHeader)
      return true
    })
    net.addReadHook(({ type, id, data, header }) => {
      if (type !== MessageType.object) return
      if (!header || header.type !== "tunnel") return
      this.receiveTunnel(id, data, header as TunnelHeader)
      return true
    })
  }

  sendBubbleUnrouted(id: string, data: any, header: any): void {
    const msgHeader: BubbleHeader = {
      ...header,
      type: "bubble",
      routed: false,
      path: [this.name]
    }
    for (const node of this.name2Parent.values()) {
      node.send(id, data, msgHeader)
    }
  }

  sendBubbleRouted(id: string, data: any, header: any, route: string[]): void {
    const nextNode = this.name2Parent.get(route[0])
    if (nextNode) {
      const msgHeader: BubbleHeader = {
        ...header,
        type: "bubble",
        routed: true,
        path: route,
      }
      nextNode.send(id, data, msgHeader)
    }
  }

  receiveBubble(id: string, data: any, header: BubbleHeader): void {
    if (header.routed) {
      const nextNode = this.name2Parent.get(header.path[header.path.indexOf(this.name) + 1])
      if (nextNode) {
        // handle message content
        this.emit("bubble-pass", id, data, header)
        nextNode.send(id, data, header)
      } else {
        // Reach end
        this.emit("bubble-end", id, data, header)
      }
    } else {
      header.path.push(this.name)
      this.emit("bubble-pass", id, data, header)
      for (const node of this.name2Parent.values()) {
        node.send(id, data, header)
      }
    }
  }

  sendTunnelUnrouted(id: string, data: any, header: any): void {
    const msgHeader: TunnelHeader = {
      ...header,
      type: "tunnel",
      routed: false,
      path: [this.name]
    }
    for (const node of this.name2Child.values()) {
      node.net.send(id, data, msgHeader)
    }
  }

  sendTunnelRouted(id: string, data: any, header: any, route: string[]): void {
    const nextNode = this.name2Child.get(route[0])
    if (nextNode) {
      const msgHeader: TunnelHeader = {
        ...header,
        type: "tunnel",
        routed: true,
        path: route,
      }
      nextNode.net.send(id, data, msgHeader)
    }
  }

  receiveTunnel(id: string, data: any, header: TunnelHeader): void {
    if (header.routed) {
      const nextNode = this.name2Child.get(header.path[header.path.indexOf(this.name) + 1])
      if (nextNode) {
        // handle message content
        this.emit("tunnel-pass", id, data, header)
        nextNode.net.send(id, data, header)
      } else {
        // Reach end
        this.emit("tunnel-end", id, data, header)
      }
    } else {
      header.path.push(this.name)
      this.emit("tunnel-pass", id, data, header)
      for (const node of this.name2Child.values()) {
        node.net.send(id, data, header)
      }
    }
  }
}

/**
 * Bubble message travels up the node tree.
 */
export interface BubbleHeader {
  type: "bubble"
  /**
  * If true, the message has a clear route to pass through.
  * {@link path} means the route. e.g.: ["leaf", "parent1", "parent2", "root"].
  * 
  * If false, the message doesn't map out a route.
  * {@link path} means the nodes this message has passed through. e.g.: ["leaf", "parent1"].
  */
  routed: boolean
  path: string[]
  [key: string]: any
}
/**
 * Tunnel message travels down the node tree.
 */
export interface TunnelHeader {
  type: "tunnel"
  /**
   * If true, the message has a clear route to pass through.
   * {@link path} means the route. e.g.: ["root", "sub1", "sub2", "leaf"].
   * 
   * If false, the message doesn't map out a route.
   * {@link path} means the nodes this message has passed through. e.g.: ["root", "sub1"].
   */
  routed: boolean
  path: string[]
  [key: string]: any
}

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

export interface CentralBehavior {
  node: MeditreeNode
  server?: any
}

export async function setupAsCentral(
  config: MeshAsCentralConfig,
  $: CentralBehavior,
): Promise<void> {
  const log = createLogger("Central")
  // as central
  const wss = new WebSocketServer({
    server: $.server,
    port: $.server ? undefined : config.port,
    path: "/ws",
  })
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  wss.on("connection", async (ws: WebSocket) => {
    const net = new Net(ws)
    $.node.attachHooks(net)
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
      net.handleDatapack(data as Buffer)
    })
    const nodeMeta = await authenticateNodeAsCentral(net, log, config)
    if (!nodeMeta) return
    $.node.name2Child.set(nodeMeta.name, new SubNode(nodeMeta.name, net))
    ws.on("close", () => {
      $.node.name2Child.delete(nodeMeta.name)
    })
  })
}
export type LocalFileTreeRebuildCallback = (
  { json, jsonString, tree }: { json: FileTreeJson, jsonString: string, tree: FileTree }
) => void

export interface NodeBehavior {
  node: MeditreeNode
  onLocalFileTreeRebuild: (id: string, listener: LocalFileTreeRebuildCallback) => void
  offListeners: (id: string) => void
}

export async function setupAsNode(
  config: MeshAsNodeConfig,
  $: NodeBehavior
): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const net = new Net(ws)
    net.debug = (id, message) => {
      log.debug(id, message)
    }
    $.node.attachHooks(net)
    let isConnected = false
    net.startDaemonWatch()
    let centralInfo: CentralInfo | undefined
    ws.on("error", (error) => { log.error(error) })
    ws.on("open", async () => {
      isConnected = true
      log.info(`Connected to ${central.server}.`)
      centralInfo = await authenticateAsNode(net, log, central, config)
      if (!centralInfo) return
      $.node.name2Parent.set(centralInfo.name, net)
      $.onLocalFileTreeRebuild(centralInfo.name, ({ jsonString }) => {
        $.node.sendBubbleUnrouted("file-tree-rebuild", jsonString, {
        })
      })
    })
    ws.on("close", () => {
      if (!isConnected) return
      if (centralInfo) {
        $.offListeners(centralInfo.name)
        $.node.name2Parent.delete(centralInfo.name)
      }
      log.info(`Disconnected from ${central.server}.`)
    })
    ws.on("message", (data) => {
      net.handleDatapack(data as Buffer)
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
  const challenge = uuidv4()
  const { publicKey }: { publicKey: string } = await net.getMessage("auth-public-key")
  log.trace(publicKey)
  if (!config.node.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
  log.info(`"${publicKey}" is challenging with "${challenge}".`)
  const challengeEncrypted = encrypt(challenge, nonce, publicKey, config.privateKey)
  net.send("auth-challenge", {
    name: config.name,
    challenge: challengeEncrypted,
    nonce: Buffer.from(nonce).toString("base64"),
    publicKey: config.publicKey,
  })
  const { resolved } = await net.getMessage("auth-challenge-solution")
  if (resolved !== challenge) {
    log.info(`"${publicKey}" challenge failed.`)
    net.send("auth-challenge-solution-result", {
      result: ChallengeResult.failure,
    })
    net.close()
    return
  }
  log.info(`"${publicKey}" is authenticated.`)
  net.send("auth-challenge-solution-result", {
    result: ChallengeResult.success,
  })
  const nodeMeta: NodeMeta = await net.getMessage("node-meta")
  log.info(`Receieved node meta "${JSON.stringify(nodeMeta)}".`)
  // If the node has passcode and it doesn't match this central's passcode, then report an error
  if (nodeMeta.passcode && nodeMeta.passcode !== config.passcode) {
    net.send("node-meta-result", {
      result: NodeMetaResult.passcodeConflict,
    })
    log.info(`Node[${nodeMeta.name}] conflicts with this passcode.`)
    net.close()
    return
  }
  net.send("node-meta-result", {
    result: NodeMetaResult.success,
  })
  log.info(`Node[${nodeMeta.name}] is accepted.`)
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
  net.send("auth-public-key", {
    publicKey: config.publicKey
  })
  const { name, challenge, publicKey, nonce } = await net.getMessage("auth-challenge")
  const encrypted = Buffer.from(challenge, "base64")
  const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
  if (resolved === null) {
    log.error("challenge failed.")
    net.close()
    return
  }
  log.info(`Resolved challenge "${resolved}" from ${central.server}.`)
  net.send("auth-challenge-solution", {
    resolved
  })
  const challengeResultPayload: {
    result: ChallengeResult
  } = await net.getMessage("auth-challenge-solution-result")
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
  net.send("node-meta", nodeMeta)
  const nodeMetaResultPayload: {
    result: NodeMetaResult
  } = await net.getMessage("node-meta-result")
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
