import { LocalFile } from "../file.js"
import { type MeditreePlugin } from "../plugin.js"
import { Readable } from "stream"
import fs from "fs"
import path, { join, dirname } from "path"
import { promisify } from "util"
import { hash32Bit } from "../crypt.js"
import { createLogger } from "../logger.js"
interface CachePluginConfig {
  /**
   * The max file size for being cached.
   * 10MB by default.
   */
  maxSize?: number
  /**
   * The max time in ms to live for the cache.
   * 24 hours by default.
   */
  maxAge?: number
  /**
   * The cache root direcotry.
   * "meditree-cache" by default.
   */
  root?: string
}

const fsstate = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
export function CachePlugin(config: CachePluginConfig): MeditreePlugin {
  const maxSize = config.maxSize ?? 10 * 1024 * 1024
  const maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
  const root = config.root ?? "meditree-cache"
  const log = createLogger("Cache")
  log.info(`The cache directory is located at ${path.resolve(root)}.`)

  function getCachePath(nodeName: string, path: string): string {
    return join(root, hash(nodeName), hash(path))
  }

  return {
    async onNodeCreateReadStream(node, file, options?) {
      // ignore local file requests
      if (file.inner instanceof LocalFile) return
      // ignore large files
      if (file.inner.size > maxSize) return
      // for remote file
      if (typeof file.remoteNode === "string") {
        const cachePath = getCachePath(file.remoteNode, file.inner.path)
        // if cached, capable to read partial file
        if (fs.existsSync(cachePath) && (await fsstate(cachePath)).isFile()) {
          return fs.createReadStream(cachePath, options)
        }
        // if not cached, ignore partial file
        if (options) {
          if (options.start !== undefined && options.start !== 0) return
          if (options.end !== undefined && options.end !== file.inner.size - 1) return
        }
        const stream = await node.createReadStream(file)
        if (stream === null) return null
        await mkdir(dirname(cachePath), { recursive: true })
        // clone the incoming stream
        const [forCache, forResponse] = duplicateStream(stream)
        // ensure parent directory exists.
        const cache = fs.createWriteStream(cachePath)
        // write into cache
        forCache.pipe(cache)
        // return a clone
        return forResponse
      }
    }
  }
}

function hash(input: string): string {
  const hashcode = hash32Bit(input)
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(hashcode)
  return buffer.toString("base64url")
}

function duplicateStream(input: Readable): [Readable, Readable] {
  const stream1 = new Readable({ read() { } })
  const stream2 = new Readable({ read() { } })
  input.on("data", (data) => {
    stream1.push(data)
    stream2.push(data)
  })
  input.on("end", () => {
    stream1.emit("end")
    stream2.emit("end")
  })
  input.on("close", () => {
    stream1.emit("close")
    stream2.emit("close")
  })
  input.on("error", (err) => {
    stream1.push(err)
    stream2.push(err)
  })
  return [stream1, stream2]
}
