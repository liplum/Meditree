/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-misused-promises */
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import { v4 as uuidv4 } from "uuid"
import { Net, MessageType } from "./net.js"
import { type FileTreeLike, type FileTree, type File, filterFileTreeJson, ResolvedFile, LocalFile } from "./file.js"
import EventEmitter from "events"
import { type Readable } from "stream"
import fs from "fs"
import { type AsParentConfig, type AsChildConfig, } from "./config.js"
import type expressWs from "express-ws"
import { encrypt, decrypt, generateNonce } from "./crypt.js"

interface NodeMeta {
  name: string
  passcode?: string
}

class SubNode implements FileTreeLike {
  readonly meta: NodeMeta
  readonly net: Net
  tree: FileTree
  constructor(meta: NodeMeta, net: Net) {
    this.meta = meta
    this.net = net
  }

  resolveFile(pathParts: string[]): ResolvedFile | null {
    let cur: File | FileTree = this.tree
    let curPart: string | undefined
    while ((curPart = pathParts.shift()) !== undefined) {
      if ((cur = cur[curPart]) === undefined) return null
    }
    if ("type" in cur) {
      const resolved = new ResolvedFile(cur as File)
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
  files: FileTree
}
export type RouteMsgCallback<Header = any> = (id: string, data: any, header: Header) => void
export declare interface MeditreeNode {
  on(event: "file-tree-update", listener: (entireFree: FileTree) => void): this
  on(event: "child-node-change", listener: (child: SubNode, isAdded: boolean) => void): this
  on(event: "parent-node-change", listener: (parent: ParentNode, isAdded: boolean) => void): this

  off(event: "file-tree-update", listener: (entireFree: FileTree) => void): this
  off(event: "child-node-change", listener: (child: SubNode, isAdded: boolean) => void): this
  off(event: "parent-node-change", listener: (parent: ParentNode, isAdded: boolean) => void): this

  emit(event: "file-tree-update", entireFree: FileTree): boolean
  emit(event: "child-node-change", child: SubNode, isAdded: boolean): boolean
  emit(event: "parent-node-change", parent: ParentNode, isAdded: boolean): this
}
export class MeditreeNode extends EventEmitter implements FileTreeLike {
  private readonly name2Parent = new Map<string, ParentNode>()
  private readonly name2Child = new Map<string, SubNode>()
  localTree?: { name: string, tree: FileTreeLike, json: FileTree }
  subNodeFilter?: (file: File) => boolean

  constructor() {
    super()
    this.on("file-tree-update", (fullTree) => {
      for (const parent of this.name2Parent.values()) {
        parent.net.send("file-tree-rebuild", fullTree)
      }
    })
  }

  resolveFile(pathParts: string[]): ResolvedFile | null {
    const nodeName = pathParts.shift()
    if (!nodeName) return null
    if (this.localTree && nodeName === this.localTree.name) {
      return this.localTree.tree.resolveFile(pathParts)
    } else {
      const node = this.name2Child.get(nodeName)
      if (!node) return null
      pathParts.unshift(nodeName)
      return node.resolveFile(pathParts)
    }
  }

  async createReadStream(file: ResolvedFile, options?: BufferEncoding | any): Promise<Readable | null> {
    // if the file has a path, it's a local file
    if (file.inner instanceof LocalFile) {
      return fs.createReadStream(file.inner.localPath, options)
    } else if (file.remoteNode) {
      const remoteNode: string = file.remoteNode
      const node = this.name2Child.get(remoteNode)
      if (!node) throw new Error(`Node[${remoteNode}] not found.`)
      const uuid = uuidv4()
      node.net.send("get-file", { path: file.path, options, uuid })
      const stream = await node.net.getMessage("send-file", (header) => header && header.uuid === uuid)
      return stream
    }
    return null
  }

  updateFileTreeFromSubNode(name: string, tree: FileTree): void {
    const node = this.name2Child.get(name)
    if (!node) throw new Error(`Node[${name}] not found.`)
    console.log(`File Tree from node[${name}] is updated.`)
    if (this.subNodeFilter) {
      node.tree = filterFileTreeJson(tree, this.subNodeFilter)
    } else {
      node.tree = tree
    }
    this.emit("file-tree-update", this.toJSON())
  }

  updateFileTreeFromLocal(name: string, tree: FileTreeLike): void {
    const json = tree.toJSON()
    this.localTree = { name, tree, json }
    this.emit("file-tree-update", this.toJSON())
  }

  toJSON(): FileTree {
    const obj: FileTree = {}
    for (const node of this.name2Child.values()) {
      if (node.tree) {
        for (const [fileName, file] of Object.entries(node.tree)) {
          obj[fileName] = file
        }
      }
    }
    if (this.localTree) {
      obj[this.localTree.name] = this.localTree.json
    }
    return obj
  }

  private async handleGetFile(path: string, uuid: string, receiver: Net, options?: BufferEncoding | any): Promise<void> {
    const pathParts = path.split("/")
    const file = this.resolveFile(pathParts)
    if (file) {
      console.log(path, options)
      const stream = await this.createReadStream(file, options)
      receiver.send("send-file", stream, { uuid, path })
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
      this.emit("file-tree-update", this.toJSON())
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
    setInterval(() => {
      console.log(Array.from(net.id2ReadingStream.keys()))
    }, 500)
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
}

export async function setupAsParent(
  node: MeditreeNode,
  config: AsParentConfig,
  app?: expressWs.Application,
): Promise<void> {
  const log = createLogger("Central")
  // as central
  if (app) {
    app.ws("/ws", async (ws, _req) => {
      await setupWs(ws)
    })
  } else {
    const wss = new WebSocketServer({
      port: config.port,
      path: "/ws",
    })
    wss.on("connection", async (ws: WebSocket) => {
      await setupWs(ws)
    })
  }
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  async function setupWs(ws: WebSocket): Promise<void> {
    const net = new Net(ws)
    net.startDaemonWatch()
    log.trace("A websocket is established.")
    ws.on("error", (error) => {
      log.error(error)
    })
    ws.on("close", () => {
      log.trace("A websocket is closed.")
    })
    ws.on("message", (data) => {
      try {
        net.handleDatapack(data as Buffer)
      } catch (error) {
        log.trace("A websocket is aborted due to an error.")
        log.error(error)
        net.close()
      }
    })
    const nodeMeta = await authenticateChild(net, log, config)
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
      if (error.message === "Unexpected server response: 502") return
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
}

async function authenticateChild(
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
    net.close()
    return
  }
  log.info(`"${publicKey}" is authenticated.`)
  net.send("auth-challenge-solution-result", {
    result: ChallengeResult.success,
  })
  const nodeMeta: NodeMeta = await net.getMessage("node-meta")
  log.info(`Receieved node meta "${JSON.stringify(nodeMeta)}".`)
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
    net.close()
    return
  }
  log.info(`Resolved challenge "${resolved}" from ${parent}.`)
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
  log.info(`Authenticated on ${parent}.`)
  const nodeMeta: NodeMeta = {
    name: config.name,
    passcode: config.passcode,
  }
  net.send("node-meta", nodeMeta)
  const nodeMetaResultPayload: {
    result: NodeMetaResult
  } = await net.getMessage("node-meta-result")
  if (nodeMetaResultPayload.result !== NodeMetaResult.success) {
    log.error(`Central["${parent}"] rejects this node.`)
    net.close()
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
