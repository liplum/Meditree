import { type ResolvedFile, type FileTree, LocalFile } from "../file.js"
import { type MeditreePlugin, pluginTypes } from "../plugin.js"
import { type ReadStreamOptions } from "../meditree.js"
import { type Readable } from "stream"
import { createHash } from "crypto"
import fs from "fs"
// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["cache"] = (config) => new CachePlugin(config)
const md5 = createHash("md5")

interface CachePluginConfig {
  /**
   * The max file size for being cached.
   * 5MB by default.
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
  path?: string
}

export class CachePlugin implements MeditreePlugin {
  readonly maxSize: number
  readonly maxAge: number
  readonly path: string
  constructor(config: CachePluginConfig) {
    this.maxSize = config.maxSize ?? 5 * 1024 * 1024
    this.maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
    this.path = config.path ?? "meditree-cache"
  }

  init(): void {
  }

  async onCreateReadStream(file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null> {
    if (file.inner instanceof LocalFile) {
      return fs.createReadStream(file.inner.localPath, options)
    }
    // for remote file
    if (typeof file.remoteNode === "string") {
    }
    return null
  }
}

function hash(input: string): string {
  const hash = md5.update(input, "utf8").digest("hex")
  return hash.slice(0, 12)
}
function timestampToBuffer(timestamp: number): Buffer {
  const buffer = Buffer.alloc(4) // create a new buffer with 4 bytes
  buffer.writeUInt32BE(timestamp, 0) // write the timestamp integer in big-endian byte order
  return buffer
}
