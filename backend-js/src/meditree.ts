/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-misused-promises */
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import { v4 as uuidv4 } from "uuid"
import { Net, MessageType } from "./net.js"
import { type FileTreeLike, type FileTree, type File, ResolvedFile, LocalFile } from "./file.js"
import EventEmitter from "events"
import { type Readable } from "stream"
import fs from "fs"
import { type AsParentConfig, type AsChildConfig, } from "./config.js"
import { encrypt, decrypt, generateNonce } from "./crypt.js"
import type http from "http"
interface NodeMeta {
  name: string
}

class SubNode implements FileTreeLike {
  readonly meta: NodeMeta
  readonly net: Net
  tree: FileTree
  constructor(meta: NodeMeta, net: Net) {
    this.meta = meta
    this.net = net
  }

  /**
   * Resolves a file given its path parts.
   * @param pathParts The parts of the file's path.
   * @returns The resolved file or `null` if it could not be found.
   */
  resolveFile(pathParts: string[]): ResolvedFile | null {
    if (!this.tree) return null
    let cur: File | FileTree = this.tree
    for (let curIndex = 0; curIndex < pathParts.length; curIndex++) {
      const curPart = pathParts[curIndex]
      if (cur[curPart] === undefined) return null
      cur = cur[curPart]
    }

    if (cur["*type"]) {
      const resolved = new ResolvedFile(cur as File, pathParts.join("/"))
      resolved.remoteNode = this.meta.name
      return resolved
    } else {
      return null
    }
  }

  get name(): string {
    return this.meta.name
  }

  toJSON(): FileTree {
    return this.tree
  }
}
class ParentNode {
  readonly name: string
  readonly address: string
  readonly net: Net
  constructor(name: string, address: string, net: Net) {
    this.name = name
    this.address = address
    this.net = net
  }
}
export interface FileTreeInfo {
  name: string
  root: FileTree
}
export interface ReadStreamOptions {
  start?: number
  end?: number
}
export declare interface MeditreeNode {
  on(event: "file-tree-update", listener: (entireTree: FileTree) => void): this
  on(event: "child-node-change", listener: (child: SubNode, isAdded: boolean) => void): this
  on(event: "parent-node-change", listener: (parent: ParentNode, isAdded: boolean) => void): this

  off(event: "file-tree-update", listener: (entireFree: FileTree) => void): this
  off(event: "child-node-change", listener: (child: SubNode, isAdded: boolean) => void): this
  off(event: "parent-node-change", listener: (parent: ParentNode, isAdded: boolean) => void): this

  emit(event: "file-tree-update", entireFree: FileTree): boolean
  emit(event: "child-node-change", child: SubNode, isAdded: boolean): boolean
  emit(event: "parent-node-change", parent: ParentNode, isAdded: boolean): boolean
}
export interface MeditreeNodePlugin {
  onEntireTreeUpdated?(tree: FileTree): FileTree
}
export class MeditreeNode extends EventEmitter implements FileTreeLike {
  private readonly name2Parent = new Map<string, ParentNode>()
  private readonly name2Child = new Map<string, SubNode>()
  localTree?: { name: string, tree: FileTreeLike, json: FileTree }
  plugins?: MeditreeNodePlugin[]
  log: Logger = createLogger("Meditree")
  constructor() {
    super()
    this.on("file-tree-update", (entireTree) => {
      for (const parent of this.name2Parent.values()) {
        parent.net.send("file-tree-rebuild", entireTree)
      }
    })
    this.on("parent-node-change", (parent, isAdded) => {
      if (!isAdded) return
      parent.net.send("file-tree-rebuild", this.toJSON())
    })
  }

  resolveFile(pathParts: string[]): ResolvedFile | null {
    const nodeName = pathParts[0]
    if (!nodeName) return null
    const node = this.name2Child.get(nodeName)
    if (node) {
      pathParts.shift()
      return node.resolveFile(pathParts)
    } else if (this.localTree) {
      return this.localTree.tree.resolveFile(pathParts)
    } else {
      return null
    }
  }

  async createReadStream(file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null> {
    // if the file has a path, it's a local file
    if (file.inner instanceof LocalFile) {
      const path = file.inner.localPath
      // if file not exists, return null
      if (!fs.existsSync(path)) return null
      try {
        return fs.createReadStream(file.inner.localPath, options)
      } catch (error) {
        return null
      }
    }
    if (typeof file.remoteNode === "string") {
      const node = this.name2Child.get(file.remoteNode)
      if (!node) throw new Error(`Node[${file.remoteNode}] not found.`)
      const uuid = uuidv4()
      node.net.send("get-file", { path: file.path, options, uuid })
      try {
        const stream = await node.net.getMessage("send-file", (header) => header && header.uuid === uuid)
        return stream
      } catch (error) {
        return null
      }
    }
    return null
  }

  updateFileTreeFromSubNode(name: string, tree: FileTree): void {
    const node = this.name2Child.get(name)
    if (!node) throw new Error(`Node[${name}] not found.`)
    this.log.info(`File Tree from node[${name}] is updated.`)
    node.tree = tree
    this.emitNewEntireTreeUpdateEvent()
  }

  updateFileTreeFromLocal(name: string, tree: FileTreeLike): void {
    const json = tree.toJSON()
    this.localTree = { name, tree, json }
    this.emitNewEntireTreeUpdateEvent()
  }

  private emitNewEntireTreeUpdateEvent(): void {
    let entireTree: FileTree = this.toJSON()
    if (this.plugins) {
      for (const plugin of this.plugins) {
        if (plugin.onEntireTreeUpdated) {
          entireTree = plugin.onEntireTreeUpdated(entireTree)
        }
      }
    }
    this.emit("file-tree-update", entireTree)
  }

  toJSON(): FileTree {
    const obj: FileTree = {
      ...this.localTree?.json
    }
    // TODO: What if node name conflicts with a file or a folder?
    for (const node of this.name2Child.values()) {
      if (node.tree) {
        obj[node.name] = node.tree
      }
    }
    return obj
  }

  private async handleGetFile(
    path: string, uuid: string,
    receiver: Net, options?: ReadStreamOptions
  ): Promise<void> {
    const pathParts = path.split("/")
    const file = this.resolveFile(pathParts)
    if (file) {
      const stream = await this.createReadStream(file, options)
      if (stream) {
        receiver.send("send-file", stream,
          { uuid, path }
        )
      } else {
        // TODO: send error
        receiver.sendError("send-file", new Error("FileReadStream cannot be created."),
          { uuid, path }
        )
      }
    }
  }

  addChildNode(meta: NodeMeta, net: Net): void {
    const node = new SubNode(meta, net)
    this.name2Child.set(meta.name, node)
    net.addReadHook(({ type, id, data }) => {
      if (type !== MessageType.object) return
      if (id !== "file-tree-rebuild") return
      const files: FileTree = data
      this.updateFileTreeFromSubNode(meta.name, files)
      return true
    })
    this.emit("child-node-change", node, true)
  }

  removeChildNode(name: string): void {
    const node = this.name2Child.get(name)
    if (node) {
      this.name2Child.delete(name)
      this.emit("child-node-change", node, false)
      // when a child is removed, rebuild the entire tree
      this.emitNewEntireTreeUpdateEvent()
    }
  }

  addParentNode(name: string, address: string, net: Net): void {
    const node = new ParentNode(name, address, net)
    this.name2Parent.set(name, node)
    net.addReadHook(({ type, id, data }) => {
      if (id !== "get-file") return
      if (type !== MessageType.object) return
      const { path, options, uuid } = data
      this.handleGetFile(path, uuid, net, options)
      return true
    })
    this.emit("parent-node-change", node, true)
  }

  removeParentNode(name: string): void {
    const node = this.name2Parent.get(name)
    if (node) {
      this.name2Parent.delete(name)
      this.emit("parent-node-change", node, false)
    }
  }

  get parents(): Iterable<[string, ParentNode]> {
    return this.name2Parent.entries()
  }

  get children(): Iterable<[string, SubNode]> {
    return this.name2Child.entries()
  }

  hasParent(name: string): boolean {
    return this.name2Parent.has(name)
  }

  hasChild(name: string): boolean {
    return this.name2Child.has(name)
  }
}

export async function setupAsParent(
  node: MeditreeNode,
  config: AsParentConfig,
  app: http.Server,
): Promise<void> {
  const log = createLogger("Central")
  // as central
  const wss = new WebSocketServer({
    server: app,
    path: "/ws",
  })
  wss.on("connection", (ws: WebSocket) => {
    setupWs(ws)
  })
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  async function setupWs(ws: WebSocket): Promise<void> {
    const net = new Net(ws)
    net.startDaemonWatch()
    log.verbose("A websocket is established.")
    ws.on("error", (error) => {
      log.error(error)
    })
    ws.on("close", () => {
      log.verbose("A websocket is closed.")
    })
    ws.on("message", (data) => {
      try {
        net.handleDatapack(data as Buffer)
      } catch (error) {
        log.verbose("A websocket is aborted due to an error.")
        log.error(error)
        net.close(3400)
      }
    })
    const nodeMeta = await authenticateChild(node, net, log, config)
    if (!nodeMeta) return
    node.addChildNode(nodeMeta, net)
    ws.on("close", () => {
      node.removeChildNode(nodeMeta.name)
    })
  }
}

export async function setupAsChild(
  node: MeditreeNode,
  config: AsChildConfig,
): Promise<void> {
  const connected: string[] = []
  for (const parent of config.parent) {
    await connectTo(parent)
  }
  if (config.reconnectInterval) {
    setInterval(async () => {
      for (const parent of config.parent) {
        if (!connected.includes(parent)) {
          await connectTo(parent)
        }
      }
    }, config.reconnectInterval).unref()
  }
  async function connectTo(parent: string): Promise<void> {
    const log = createLogger(`Parent[${parent}]`)
    const ws = new WebSocket(`${convertUrlToWs(parent)}/ws`)
    const net = new Net(ws)
    connected.push(parent)
    net.startDaemonWatch()
    let isConnected = false
    let centralInfo: CentralInfo | undefined
    ws.on("error", (error) => {
      // ignore connection errors
      if (error.message.includes("502")) return
      if (error.message.includes("504")) return
      log.error(error)
    })
    ws.on("open", async () => {
      isConnected = true
      log.info(`Connected to ${parent}.`)
      centralInfo = await authenticateForParent(net, log, parent, config)
      if (!centralInfo) return
      node.addParentNode(centralInfo.name, parent, net)
    })
    ws.on("close", () => {
      connected.splice(connected.indexOf(parent), 1)
      if (!isConnected) return
      if (centralInfo) {
        node.removeParentNode(centralInfo.name)
      }
      log.info(`Disconnected from ${parent}.`)
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
  success = "success",
  nameConflict = "nameConflict",
}

async function authenticateChild(
  node: MeditreeNode,
  net: Net,
  log: Logger,
  config: AsParentConfig,
): Promise<NodeMeta | undefined> {
  const nonce = generateNonce()
  const challenge = uuidv4()
  const { publicKey }: { publicKey: string } = await net.getMessage("auth-public-key")
  if (!config.child.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
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
    net.close(3401)
    return
  }
  log.info(`"${publicKey}" is authenticated.`)
  net.send("auth-challenge-solution-result", {
    result: ChallengeResult.success,
  })
  const nodeMeta: NodeMeta = await net.getMessage("node-meta")
  log.info(`Receieved node meta "${JSON.stringify(nodeMeta)}".`)
  if (node.hasChild(nodeMeta.name)) {
    net.send("node-meta-result", {
      result: NodeMetaResult.nameConflict,
    })
    net.close(3401)
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
async function authenticateForParent(
  net: Net,
  log: Logger,
  parent: string,
  config: AsChildConfig,
): Promise<CentralInfo | undefined> {
  net.send("auth-public-key", {
    publicKey: config.publicKey
  })
  const { name, challenge, publicKey, nonce } = await net.getMessage("auth-challenge")
  const encrypted = Buffer.from(challenge, "base64")
  const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
  if (resolved === null) {
    log.error("challenge failed.")
    net.close(3401)
    return
  }
  log.info(`Resolved challenge, raw: "${resolved}".`)
  net.send("auth-challenge-solution", {
    resolved
  })
  const challengeResultPayload: {
    result: ChallengeResult
  } = await net.getMessage("auth-challenge-solution-result")
  if (challengeResultPayload.result !== ChallengeResult.success) {
    log.error("challenge failed.")
    net.close(3401)
    return
  }
  log.info(`Authenticated on ${parent}.`)
  const nodeMeta: NodeMeta = {
    name: config.name,
  }
  net.send("node-meta", nodeMeta)
  const nodeMetaResultPayload: {
    result: NodeMetaResult
  } = await net.getMessage("node-meta-result")
  if (nodeMetaResultPayload.result === NodeMetaResult.nameConflict) {
    log.error("There is a name conflict, please try another name.")
    net.close(3403)
    return
  }
  if (nodeMetaResultPayload.result !== NodeMetaResult.success) {
    log.error("This node was rejected.")
    net.close(3403)
    return
  }
  return {
    name,
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
