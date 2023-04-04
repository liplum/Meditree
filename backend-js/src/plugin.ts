import { type Server } from "http"
import { type Readable } from "stream"
import { type ResolvedFile, type FileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type ReadStreamOptions, type MeditreeNode } from "./meditree.js"

export const pluginTypes: Record<string, (config: Record<string, any>) => MeditreePlugin> = {}

export interface MeditreePlugin extends FileTreePlugin {
  init?(): void

  setupServer?(app: Express.Application, server: Server): void

  setupMeditreeNode?(node: MeditreeNode): void

  onRequestHandlerRegistering?(app: Express.Application): void

  onPostGenerated?(tree: FileTree): void

  /**
   * @param tree the entire file tree will be sent to both clients and parent nodes.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeUpdated?(tree: FileTree): FileTree

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeForClient?(tree: FileTree): FileTree
  /**
   * The first plugin which returns a non-undefined value will be taken.
   * @returns undefined if not handled by this plugin.
   */
  onCreateReadStream?(file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null | undefined>
}

export function resolvePlguinFromConfig(config: Record<string, Record<string, any>>): MeditreePlugin[] {
  const plugins: MeditreePlugin[] = []
  for (const [name, pluginConfig] of Object.entries(config)) {
    const ctor = pluginTypes[name]
    if (ctor) {
      const plugin = ctor(typeof pluginConfig === "object" ? pluginConfig : {})
      plugins.push(plugin)
    } else {
      console.log(`Plugin[${name}] doesn't exist.`)
    }
  }
  return plugins
}
