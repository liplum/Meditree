import { type Server } from "http"
import { type FileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type MeditreeNode } from "./meditree.js"

export const pluginTypes: Record<string, (config: Record<string, any>) => MeditreePlugin> = {}

export abstract class MeditreePlugin implements FileTreePlugin {
  init(): void { }

  setupServer(app: Express.Application, server: Server): void { }

  onRequestHandlerRegistering(app: Express.Application): void { }

  onMeditreeNodeCreated(node: MeditreeNode): void { }

  onPostGenerated(tree: FileTree): void { }

  /**
   * @param tree the entire file tree will be sent to both clients and parent nodes.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeUpdated(tree: FileTree): FileTree { return tree }

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeForClient(tree: FileTree): FileTree { return tree }
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
