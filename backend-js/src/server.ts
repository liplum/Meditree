/* eslint-disable @typescript-eslint/no-misused-promises */
import { HostTree } from "./host.js"
import { type AppConfig, FileType } from "./config.js"
import express, { type Request, type Response } from "express"
import { FileTree, type File, type FileTreeJson } from "./file.js"
import cors from "cors"
import { type MeshAsCentralConfig, type MeshAsNodeConfig, setupAsCentral, setupAsNode, type LocalFileTreeRebuildCallback, MeditreeNode } from "./meditree.js"
import { createLogger } from "./logger.js"
import { buildIndexHtml } from "./page.js"

export async function startServer(config: AppConfig): Promise<void> {
  console.time("Start Server")
  const app = express()
  app.use(cors())
  app.use(express.json())
  const log = createLogger("Main")
  const localTree = new HostTree({
    root: config.root,
    fileTypePattern: config.fileTypePattern,
    rebuildInterval: config.rebuildInterval,
    ignorePattern: config.ignore ?? [],
  })
  const centralName2Handler = new Map<string, {
    onLocalFileTreeRebuild?: LocalFileTreeRebuildCallback
  }>()
  const node = new MeditreeNode(config.name, localTree)
  node.on("bubble-pass", (id, data, header) => {
    if (id === "file-tree-rebuild") {
      const fileTree: { name: string, files: FileTreeJson } = JSON.parse(data)
      const source = header.path[0]
      node.addOrUpdateSubNode(source, fileTree.files)
    }
  })

  // If node is defined and not empty, subnodes can connect to this.
  if (config.node?.length && config.publicKey && config.privateKey) {
    await setupAsCentral(config as any as MeshAsCentralConfig, {
      node,
      server: app
    })
  }

  // If central is defined and not empty, it will try connecting to every central.
  if (config.central?.length && config.publicKey && config.privateKey) {
    await setupAsNode(config as any as MeshAsNodeConfig, {
      node,
      onLocalFileTreeRebuild(id, listener) {
        let handler = centralName2Handler.get(id)
        if (!handler) {
          handler = {}
          centralName2Handler.set(id, handler)
        }
        handler.onLocalFileTreeRebuild = listener
      },
      offListeners(id) { centralName2Handler.delete(id) },
    })
  }

  let treeJsonObjectCache: { name: string, files: FileTreeJson } | null
  let treeJsonStringCache: string | null
  let treeIndexHtmlCache: string | null

  function updateCache(treeJsonObjectCache: any | null): void {
    treeJsonStringCache = JSON.stringify(treeJsonObjectCache, null, 1)
    treeIndexHtmlCache = buildIndexHtml(config.name, localTree.fileTree)
    for (const [name, handler] of centralName2Handler.entries()) {
      log.info(`Send rebuilt file tree to parent node[${name}].`)
      handler?.onLocalFileTreeRebuild?.({
        json: treeJsonObjectCache,
        jsonString: treeJsonStringCache,
        tree: localTree.fileTree,
      })
    }
  }
  localTree.onRebuild(() => {
    node.emit("file-tree-update", config.name, localTree)
    log.info("Local file tree is rebuilt.")
  })
  node.on("file-tree-update", (name) => {
    treeJsonObjectCache = {
      name: config.displayName ?? config.name,
      files: node.toJSON()
    }
    updateCache(treeJsonObjectCache)
    log.info(`The file tree from node[${name}] is updated.`)
  })
  localTree.startWatching()
  await localTree.rebuildFileTree()
  // If posscode is enabled.
  if (config.passcode) {
    app.use((req, res, next) => {
      const passcode = req.query.passcode ?? req.body.passcode
      if (passcode !== config.passcode) {
        res.status(401).json({ error: "wrong passcode" })
      } else {
        next()
      }
    })
  }

  app.get("/", (req, res) => {
    res.redirect("/index.html")
  })

  app.get("/index.html", (req, res) => {
    res.status(200)
    res.contentType("html")
    res.send(treeIndexHtmlCache)
  })

  app.get("/list", (req, res) => {
    res.status(200)
    res.contentType("application/json;charset=utf-8")
    res.send(treeJsonStringCache)
  })

  const fileType2handler = {
    [FileType.image]: pipeFile,
    [FileType.text]: pipeFile,
    [FileType.video]: pipeRangedFile,
    [FileType.audio]: pipeRangedFile,
  }

  app.get("/file(/*)", async (req, res) => {
    const path = removePrefix(decodeURI(req.baseUrl + req.path), "/file/")
    const file = node.resolveFile(path.split("/"))
    if (file == null) {
      res.status(404)
      return
    }
    const fileType = file.type
    if (fileType == null) {
      res.status(404)
      return
    }
    const handler = fileType2handler[config.fileType[fileType]]
    if (!handler) {
      return res.status(404).end()
    } else {
      res.header({
        "Content-Type": file.type,
      })
      await handler(req, res, file)
    }
  })
  /**
   * Ranged is for videos and audios. On Safari mobile, range headers is used.
   */
  async function pipeRangedFile(req: Request, res: Response, file: File): Promise<void> {
    // learnt from https://github.com/bootstrapping-microservices/video-streaming-example
    const { start, end } = resolveRange(req.headers.range)
    const contentLength = file.size

    let retrievedLength: number
    if (start !== undefined && end !== undefined) {
      retrievedLength = (end + 1) - start
    } else if (start !== undefined) {
      retrievedLength = contentLength - start
    } else if (end !== undefined) {
      retrievedLength = (end + 1)
    } else {
      retrievedLength = contentLength
    }

    res.statusCode = start !== undefined || end !== undefined ? 206 : 200

    res.setHeader("content-length", retrievedLength)
    if (req.headers.range) {
      res.setHeader("content-range", `bytes ${start ?? 0}-${end ?? (contentLength - 1)}/${contentLength}`)
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
