import { HostTree } from "./host.js"
import { type AppConfig, FileType } from "./config.js"
import express, { type Request, type Response } from "express"
import fs from "fs"
import { File, FileTree } from "./file.js"
import cors from "cors"
import ms from "mediaserver"
import { type MeshAsCentralConfig, type MeshAsNodeConfig, setupAsCentral, setupAsNode, type LocalFileTreeRebuildCallback } from "./tree.js"
import { createLogger } from "./logger.js"
import { type Readable } from "stream"
import { MessageNode } from "./node-tree.js"

export async function startServer(config: AppConfig): Promise<void> {
  console.time("Start Server")
  const app = express()
  app.use(cors())
  app.use(express.json())
  const log = createLogger("Main")
  const tree = new HostTree({
    root: config.root,
    fileTypePattern: config.fileTypePattern,
    rebuildInterval: config.rebuildInterval,
    ignorePattern: config.ignore ?? [],
  })
  const centralName2Handler = new Map<string, {
    onLocalFileTreeRebuild?: LocalFileTreeRebuildCallback
  }>()
  const node = new MessageNode(config.name)
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

  let treeJsonObjectCache: any | null
  let treeJsonStringCache: string | null
  let treeIndexHtmlCache: string | null
  tree.onRebuild(() => {
    treeJsonObjectCache = {
      name: config.name,
      files: tree.fileTree.toJSON()
    }
    treeJsonStringCache = JSON.stringify(treeJsonObjectCache, null, 1)
    treeIndexHtmlCache = buildIndexHtml(tree.fileTree)
    for (const [name, handler] of centralName2Handler.entries()) {
      log.info(`Send rebuilt file tree to ${name}.`)
      handler?.onLocalFileTreeRebuild?.({
        json: treeJsonObjectCache,
        jsonString: treeJsonStringCache,
        tree: tree.fileTree,
      })
    }
    log.info("FileTree is rebuilt.")
  })
  tree.startWatching()
  await tree.rebuildFileTree()

  // If posscode is enabled.
  if (config.passcode) {
    app.use((req, res, next) => {
      const passcode = req.query.passcode ?? req.body.passcode
      if (passcode !== config.passcode) {
        res.status(401).json({ error: "wrong passcode" })
        return
      }
      next()
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
    [FileType.video]: getVideo,
    [FileType.image]: getImage,
    [FileType.audio]: getAudio,
    [FileType.text]: getText,
  }

  app.get("/file(/*)", (req, res) => {
    const path = removePrefix(decodeURI(req.baseUrl + req.path), "/file/")
    const file = tree.resolveFile(path.split("/"))
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
      handler(req, res, file)
    }
  })

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

function getVideo(req: Request, res: Response, file: File): void {
  // learnt from https://github.com/bootstrapping-microservices/video-streaming-example
  const filePath = file.path

  let start: number
  let end: number

  const range = req.headers.range
  if (range) {
    const bytesPrefix = "bytes="
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length)
      const parts = bytesRange.split("-")
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
  }
  res.setHeader("content-type", "video/mp4")

  fs.stat(filePath, (err, stat) => {
    if (err != null) {
      console.error(`File stat error for ${filePath}.`)
      console.error(err)
      res.sendStatus(500)
      return
    }

    const contentLength = stat.size

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

    if (range !== undefined) {
      res.setHeader("content-range", `bytes ${start || 0}-${end || (contentLength - 1)}/${contentLength}`)
      res.setHeader("accept-ranges", "bytes")
    }

    const fileStream = fs.createReadStream(filePath, {
      start, end,
    })
    fileStream.on("error", (_) => {
      res.sendStatus(500)
    })

    fileStream.pipe(res)
  })
}

function getText(req: Request, res: Response, file: File): void {
  res.status(200)
  res.header({
    "Content-Type": file.type,
  })
  const stream = openTextReadStream(file)
  stream.pipe(res)
}

function getImage(req: Request, res: Response, file: File): void {
  res.status(200)
  res.header({
    "Content-Type": file.type,
  })
  const stream = openImageReadStream(file)
  stream.pipe(res)
}

function getAudio(req: Request, res: Response, file: File): void {
  res.status(200)
  res.header({
    "Content-Type": file.type,
  })
  ms.pipe(req, res, file.path)
}

function openImageReadStream(file: File): Readable {
  return fs.createReadStream(file.path)
}

function openTextReadStream(file: File): Readable {
  return fs.createReadStream(file.path)
}

function buildIndexHtml(tree: FileTree): string {
  const html: string[] = []
  html.push("<div>")
  function buildSubtree(ancestorPath: string, curTree: FileTree, indent: number): void {
    const indentLength = 15
    const style = `style="margin-left: ${indentLength * indent}px;"`
    for (const [name, file] of curTree.name2File.entries()) {
      const fullPath = ancestorPath.length === 0 ? name : `${ancestorPath}/${name}`
      if (file instanceof File) {
        html.push(`<a href="/file/${fullPath}" ${style}>${name}</a>`)
        html.push("<br>")
      } else if (file instanceof FileTree) {
        html.push("<div>")
        html.push(`<a" ${style}>${name}\\</a>`)
        html.push("<br>")
        buildSubtree(fullPath, file, indent + 2)
        html.push("</div>")
      }
    }
  }
  buildSubtree("", tree, 0)
  html.push("</div>")
  return html.join("")
}
