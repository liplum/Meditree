/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-misused-promises */
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import { v4 as uuidv4 } from "uuid"
import { Net, MessageType } from "./net.js"
import { LocalFile, type FileTreeLike, type FileTreeJson, type File, type RemoteFile } from "./file.js"
import EventEmitter from "events"
import { type Readable } from "stream"
import fs from "fs"
import { ForwardType, type ForwardConfig, type AsCentralConfig, type AsNodeConfig, type CentralConfig } from "./config.js"
import type expressWs from "express-ws"
import { encrypt, decrypt, generateNonce } from "./crypt.js"

class SubNode implements FileTreeLike {
  readonly name: string
  readonly net: Net
  tree: FileTreeJson
  constructor(name: string, net: Net) {
    this.name = name
    this.net = net
  }

  resolveFile(pathParts: string[]): RemoteFile | null {
    let cur: RemoteFile | FileTreeJson = this.tree
    while (pathParts.length > 0 && cur) {
      const currentPart = pathParts.shift()
      if (currentPart === undefined) break
      if (!cur.type) {
        cur = cur[currentPart]
      }
    }
    if (cur?.type) {
      cur.nodeName = this.name
      return cur as RemoteFile
    } else {
      return null
    }
  }

  toJSON(): FileTreeJson {
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
  files: FileTreeJson
}
export type RouteMsgCallback<Header = any> = (id: string, data: any, header: Header) => void
export declare interface MeditreeNode {
  on(event: "file-tree-update", listener: (entireFree: FileTreeJson) => void): this

  off(event: "file-tree-update", listener: (entireFree: FileTreeJson) => void): this

  emit(event: "file-tree-update", entireFree: FileTreeJson): boolean
}
export class MeditreeNode extends EventEmitter implements FileTreeLike {
  private readonly name2Parent = new Map<string, ParentNode>()
  private readonly name2Child = new Map<string, SubNode>()
  localTree?: { name: string, tree: FileTreeLike<LocalFile>, json: FileTreeJson }

  constructor() {
    super()
    this.on("file-tree-update", (fullTree) => {
      for (const parent of this.name2Parent.values()) {
        parent.net.send("file-tree-rebuild", fullTree)
      }
    })
  }

  resolveFile(pathParts: string[]): File | null {
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

  async createReadStream(file: File, options?: BufferEncoding | any): Promise<Readable> {
    // if the file has a path, it's a local file
    if (file instanceof LocalFile) {
      return fs.createReadStream(file.localPath, options)
    } else {
      const remoteFile = file as RemoteFile
      const node = this.name2Child.get(remoteFile.nodeName)
      if (!node) throw new Error(`Node[${remoteFile.nodeName}] not found.`)
      const uuid = uuidv4()
      node.net.send("get-file", { path: remoteFile.path, options, uuid })
      const stream = await node.net.getMessage("send-file", (header) => header && header.uuid === uuid)
      return stream
    }
  }

  updateFileTreeFromSubNode(name: string, tree: FileTreeJson): void {
    const node = this.name2Child.get(name)
    if (!node) throw new Error(`Node[${name}] not found.`)
    console.log(`File Tree from node[${name}] is updated.`)
    node.tree = tree
    this.emit("file-tree-update", this.toJSON())
  }

  updateFileTreeFromLocal(name: string, tree: FileTreeLike<LocalFile>): void {
    const json = tree.toJSON()
    this.localTree = { name, tree, json }
    this.emit("file-tree-update", this.toJSON())
  }

  toJSON(): FileTreeJson {
    const obj: FileTreeJson = {}
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
      const stream = await this.createReadStream(file, options)
      receiver.send("send-file", stream, { uuid })
    }
  }

  addChildNode(name: string, net: Net): void {
    this.name2Child.set(name, new SubNode(name, net))
    net.addReadHook(({ type, id, data }) => {
      if (type !== MessageType.object) return
      if (id !== "file-tree-rebuild") return
      const files: FileTreeJson = data
      this.updateFileTreeFromSubNode(name, files)
      return true
    })
  }

  removeChildNode(name: string): void {
    this.name2Child.delete(name)
    // when a child is removed, rebuild the entire tree
    this.emit("file-tree-update", this.toJSON())
  }

  addParentNode(name: string, address: string, net: Net): void {
    this.name2Parent.set(name, new ParentNode(name, address, net))
    net.addReadHook(({ type, id, data }) => {
      if (id !== "get-file") return
      if (type !== MessageType.object) return
      const { path, options, uuid } = data
      this.handleGetFile(path, uuid, net, options)
      return true
    })
  }

  removeParentNode(name: string): void {
    this.name2Parent.delete(name)
  }

  get parents(): Iterable<[string, ParentNode]> {
    return this.name2Parent.entries()
  }

  get children(): Iterable<[string, SubNode]> {
    return this.name2Child.entries()
  }
}

type NodeMeta = {
  name: string
  forward: ForwardType
  passcode?: string
} & ForwardConfig

export async function setupAsCentral(
  node: MeditreeNode,
  config: AsCentralConfig,
  app?: expressWs.Application,
): Promise<void> {
  const log = createLogger("Central")
  // as central
  if (app) {
    app.ws("/ws", async (ws, req) => {
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
    const nodeMeta = await authenticateNodeAsCentral(net, log, config)
    if (!nodeMeta) return
    node.addChildNode(nodeMeta.name, net)
    ws.on("close", () => {
      node.removeChildNode(nodeMeta.name)
    })
  }
}

export async function setupAsNode(
  node: MeditreeNode,
  config: AsNodeConfig,
): Promise<void> {
  const connected: string[] = []
  for (const central of config.central) {
    await connectTo(central)
  }
  setInterval(async () => {
    for (const central of config.central) {
      if (!connected.includes(central.server)) {
        await connectTo(central)
      }
    }
  }, 1).unref()
  async function connectTo(central: CentralConfig): Promise<void> {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const net = new Net(ws)
    connected.push(central.server)
    net.startDaemonWatch()
    let centralInfo: CentralInfo | undefined
    ws.on("error", (error) => { log.error(error) })
    ws.on("open", async () => {
      log.info(`Connected to ${central.server}.`)
      centralInfo = await authenticateAsNode(net, log, central, config)
      if (!centralInfo) return
      node.addParentNode(centralInfo.name, central.server, net)
    })
    ws.on("close", () => {
      connected.splice(connected.indexOf(central.server), 1)
      if (centralInfo) {
        node.removeParentNode(centralInfo.name)
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
  success = "success",
}

async function authenticateNodeAsCentral(
  net: Net,
  log: Logger,
  config: AsCentralConfig,
): Promise<NodeMeta | undefined> {
  const nonce = generateNonce()
  const challenge = uuidv4()
  const { publicKey }: { publicKey: string } = await net.getMessage("auth-public-key")
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
  config: AsNodeConfig,
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
  if (nodeMetaResultPayload.result !== NodeMetaResult.success) {
    log.error(`Central["${central.server}"] rejects this node.`)
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
