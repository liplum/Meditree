import { type ResolvedFile, type FileTree } from "../file.js"
import { type MeditreePlugin, pluginTypes } from "../plugin.js"
import PouchDB from "pouchdb"
import { type ReadStreamOptions } from "../meditree.js"
import { type Readable } from "stream"

// eslint-disable-next-line @typescript-eslint/dot-notation
pluginTypes["cache"] = (config) => new CachePlugin(config)

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
   * The cache location.
   * you can use a directory or a remote path.
   * "meditree-cache" by default.
   */
  path?: string
}

export class CachePlugin implements MeditreePlugin {
  readonly maxSize: number
  readonly maxAge: number
  readonly path: string
  db: PouchDB.Database
  constructor(config: CachePluginConfig) {
    this.maxSize = config.maxSize ?? 5 * 1024 * 1024
    this.maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
    this.path = config.path ?? "meditree-cache"
  }

  init(): void {
    this.db = new PouchDB(this.path)
  }

  async onCreateReadStream(file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null> {
    return null
  }
}
