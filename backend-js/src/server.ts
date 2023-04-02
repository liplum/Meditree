/* eslint-disable @typescript-eslint/no-misused-promises */
import { HostTree } from "./host.js"
import { type AppConfig, MediaType, type AsParentConfig, type AsChildConfig } from "./config.js"
import express, { type Request, type Response } from "express"
import { type File, type FileTreeJson } from "./file.js"
import cors from "cors"
import { setupAsParent, setupAsChild, MeditreeNode, type FileTreeInfo } from "./meditree.js"
import { createLogger } from "./logger.js"
import { buildIndexHtml } from "./page.js"
import expressWs from "express-ws"
import path from "path"

export async function startServer(config: AppConfig): Promise<void> {
  console.time("Start Server")
  const homepage = config.homepage
  const app = express()
  app.use(cors())
  app.use(express.json())
  const log = createLogger("Main")
  const localTree = !config.root
    ? undefined
    : new HostTree({
      rootPath: config.root,
      name: config.name,
      fileTypePattern: config.fileTypePattern,
      rebuildInterval: config.rebuildInterval,
      ignorePattern: config.ignore ?? [],
    })
  const node = new MeditreeNode()

  if (localTree) {
    localTree.on("rebuild", (fileTree) => {
      node.updateFileTreeFromLocal(config.name, fileTree)
      log.info("Local file tree is rebuilt.")
    })
  }
  let fullTreeCache: { obj: FileTreeInfo, json: string, html?: string }
  updateTreeJsonCache({})

  node.on("file-tree-update", (entireFree) => {
    updateTreeJsonCache(entireFree)
  })

  function updateTreeJsonCache(entireFree: FileTreeJson): void {
    let html: string | undefined
    if (typeof homepage !== "string" && (homepage === undefined || homepage === null || homepage)) {
      html = buildIndexHtml(config.mediaType, entireFree)
    }
    const info: FileTreeInfo = {
      name: config.name,
      files: entireFree,
    }
    const infoString = JSON.stringify(info, null, 1)
    fullTreeCache = {
      obj: info,
      json: infoString,
      html,
    }
  }

  node.on("parent-node-change", (parent, isAdded) => {
    if (!isAdded) return
    parent.net.send("file-tree-rebuild", fullTreeCache.obj.files)
  })

  if (localTree) {
    localTree.startWatching()
    await localTree.rebuildFileTree()
  }

  // If node is defined and not empty, subnodes can connect to this.
  if (config.child?.length && config.publicKey && config.privateKey) {
    expressWs(app)
    await setupAsParent(node, config as any as AsParentConfig,
      app as any as expressWs.Application)
  }

  // If central is defined and not empty, it will try connecting to every central.
  if (config.parent?.length && config.publicKey && config.privateKey) {
    await setupAsChild(node, config as any as AsChildConfig)
  }

  // If posscode is enabled.
  if (config.passcode) {
    app.use((req, res, next) => {
      const passcode = decodeURI(req.query.passcode as string) ?? req.body.passcode
      if (passcode !== config.passcode) {
        res.status(401).json({ error: "incorrectPasscode" })
      } else {
        next()
      }
    })
  }

  if (typeof homepage === "string") {
    app.get("/", (req, res) => {
      res.redirect(homepage)
    })
  } else if (homepage === undefined || homepage === null || homepage) {
    app.get("/", (req, res) => {
      res.status(200)
      res.contentType("html")
      res.send(fullTreeCache.html)
    })
  }

  app.get("/list", (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(fullTreeCache.json)
  })

  const fileType2handler = {
    [MediaType.image]: pipeFile,
    [MediaType.text]: pipeFile,
    [MediaType.video]: pipeRangedFile,
    [MediaType.audio]: pipeRangedFile,
  }

  app.get("/file(/*)", async (req, res) => {
    const path = removePrefix(decodeURI(req.baseUrl + req.path), "/file/")
    const file = node.resolveFile(path.split("/"))
    if (file == null) {
      res.status(404).end()
      return
    }
    const fileType = file.type
    if (fileType == null) {
      res.status(404).end()
      return
    }
    const handler = fileType2handler[config.mediaType[fileType]]
    if (!handler) {
      return res.status(404).end()
    } else {
      res.header({
        "Content-Type": file.type,
      })
      res.setHeader("Cache-Control", `max-age=${config.cacheMaxAge}`)
      await handler(req, res, file)
    }
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeRangedFile(req: Request, res: Response, file: File): Promise<void> {
    // learnt from https://github.com/bootstrapping-microservices/video-streaming-example
    let { start, end } = resolveRange(req.headers.range)
    start ??= 0
    end ??= file.size - 1
    const retrievedLength = (end + 1) - start

    res.statusCode = start !== undefined || end !== undefined ? 206 : 200

    res.setHeader("content-length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("content-range", `bytes ${start}-${end}/${file.size}`)
      res.setHeader("accept-ranges", "bytes")
    }
    const fileStream = await node.createReadStream(file, {
      start, end,
    })
    fileStream.on("error", (_) => {
      res.sendStatus(500)
    })
    fileStream.pipe(res)
  }

  async function pipeFile(req: Request, res: Response, file: File): Promise<void> {
    res.status(200)
    const stream = await node.createReadStream(file)
    stream.pipe(res)
  }

  const onRunning = (): void => {
    log.info(`Server running at http://localhost:${config.port}/`)
    console.timeEnd("Start Server")
  }
  if (config.hostname) {
    app.listen(config.port, config.hostname, onRunning)
  } else {
    app.listen(config.port, onRunning)
  }
}

function removePrefix(origin: string, prefix: string): string {
  if (origin.startsWith(prefix)) return origin.substring(prefix.length,)
  else return origin
}

function resolveRange(range?: string): { start?: number, end?: number } {
  if (!range) return {}
  let start: number | undefined
  let end: number | undefined

  if (range.startsWith("bytes=")) {
    const parts = removePrefix(range, "bytes=").split("-")
    if (parts.length === 2) {
      const rangeStart = parts[0]?.trim()
      if (rangeStart && rangeStart.length > 0) {
        start = parseInt(rangeStart)
      }
      const rangeEnd = parts[1]?.trim()
      if (rangeEnd && rangeEnd.length > 0) {
        end = parseInt(rangeEnd)
      }
    }
  }
  return { start, end }
}
