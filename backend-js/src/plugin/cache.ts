import { type FileTree } from "../file.js"
import { MeditreePlugin, pluginTypes } from "../plugin.js"
import PouchDB from "pouchdb"

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

export class CachePlugin extends MeditreePlugin {
  readonly maxSize: number
  readonly maxAge: number
  readonly path: string
  db: PouchDB.Database
  constructor(config: CachePluginConfig) {
    super()
    this.maxSize = config.maxSize ?? 5 * 1024 * 1024
    this.maxAge = config.maxAge ?? 24 * 60 * 60 * 1000
    this.path = config.path ?? "meditree-cache"
  }

  init(): void {
    this.db = new PouchDB(this.path)
  }
}
