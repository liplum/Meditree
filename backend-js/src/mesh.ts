import { ForwardType } from "./config.js"
import type { MeshAsNodeConfig, MeshAsCentralConfig, AppConfig, CentralConfig, ForwardConfig } from "./config.js"
import WebSocket, { WebSocketServer } from "ws"
import { createLogger, type Logger } from "./logger.js"
import nacl from "tweetnacl"
import { Net } from "./net.js"

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
type NodeMeta = {
  name: string
  forward: ForwardType
  passcode?: string
} & ForwardConfig

export async function setupAsCentral(config: MeshAsCentralConfig): Promise<void> {
  const log = createLogger("Central")
  // as central
  const wss = new WebSocketServer({
    port: config.port,
    path: "/ws",
  })
  log.info(`Central websocket is running on ws://localhost:${config.port}/ws.`)
  wss.on("connection", (ws: WebSocket) => {
    const net = new Net(ws)
    log.trace("A websocket is established.")
    ws.on("error", log.trace)
    ws.on("close", () => {
      log.trace("A websocket is closed.")
    })
    runAsCentralStateMachine(net, log, config)
    ws.on("message", (data) => {
      net.handleReceivedMessage(data as Buffer)
    })
  })
}

enum ChallengeResult {
  success = "success",
  failure = "failure",
}

enum NodeMetaResult {
  passcodeConflict = "passcodeConflict",
  success = "success",
}

async function runAsCentralStateMachine(
  net: Net,
  log: Logger,
  config: MeshAsCentralConfig,
): Promise<void> {
  const nonce = nacl.randomBytes(24)
  const nonceBase64 = Buffer.from(nonce).toString("base64")
  const challenge = Math.random().toString()
  const { publicKey }: { publicKey: string } = await net.readJson("auth-public-key")
  log.trace(publicKey)
  if (!config.node.includes(publicKey)) throw new Error(`${publicKey} unregistered.`)
  log.info(`"${publicKey}" is challenging with "${challenge}".`)
  const challengeEncrypted = encrypt(challenge, nonce, publicKey, config.privateKey)
  net.json("auth-challenge", {
    challenge: challengeEncrypted,
    nonce: nonceBase64,
    publicKey: config.publicKey,
  })
  const { resolved } = await net.readJson("auth-challenge-solution")
  if (resolved !== challenge) {
    log.info(`"${publicKey}" challenge failed.`)
    net.json("auth-challenge-solution-result", {
      result: ChallengeResult.failure,
    })
    net.close()
    return
  }
  log.info(`"${publicKey}" is authenticated.`)
  net.json("auth-challenge-solution-result", {
    result: ChallengeResult.success,
  })
  const nodeMeta: NodeMeta = await net.readJson("node-meta")
  log.info(`Receieved node meta "${JSON.stringify(nodeMeta)}".`)
  // If the node has passcode and it doesn't match this central's passcode, then report an error
  if (nodeMeta.passcode && nodeMeta.passcode !== config.passcode) {
    net.json("node-meta-result", {
      result: NodeMetaResult.passcodeConflict,
    })
    log.info(`Node[${nodeMeta.name}] conflicts with this passcode.`)
    net.close()
    return
  }
}

export async function setupAsNode(config: MeshAsNodeConfig): Promise<void> {
  for (const central of config.central) {
    const log = createLogger(`Node-${central.server}`)
    const ws = new WebSocket(`${convertUrlToWs(central.server)}/ws`)
    const net = new Net(ws)
    ws.on("open", () => {
      log.info(`Connected to ${central.server}.`)
      runAsNodeStateMachine(net, log, central, config)
    })
    ws.on("close", () => {
      log.info(`Disconnected from ${central.server}.`)
    })
    ws.on("message", (data) => {
      net.handleReceivedMessage(data as Buffer)
    })
  }
}

async function runAsNodeStateMachine(
  net: Net,
  log: Logger,
  central: CentralConfig,
  config: MeshAsNodeConfig,
): Promise<void> {
  net.json("auth-public-key", {
    publicKey: config.publicKey
  })
  const { challenge, publicKey, nonce } = await net.readJson("auth-challenge")
  const encrypted = Buffer.from(challenge, "base64")
  const resolved = decrypt(encrypted, nonce, publicKey, config.privateKey)
  if (resolved === null) {
    log.error("challenge failed.")
    net.close()
    return
  }
  log.info(`Resolved challenge "${resolved}" from ${central.server}.`)
  net.json("auth-challenge-solution", {
    resolved
  })
  const challengeResultPayload: { result: ChallengeResult } = await net.readJson("auth-challenge-solution-result")
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
      passcode: config.passcode,
    }
  } else { // redirect
    nodeMeta = {
      name: config.name,
      forward: ForwardType.redirect,
      redirectTo: central.redirectTo,
      passcode: config.passcode,
    }
  }
  net.json("node-meta", nodeMeta)
  const nodeMetaResultPayload: { result: NodeMetaResult } = await net.readJson("node-meta-result")
  if (nodeMetaResultPayload.result === NodeMetaResult.passcodeConflict) {
    log.error(`Passcode is conflict with the central "${central.server}"`)
    net.close()
    return
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
