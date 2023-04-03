import { type FileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type MeditreeNode } from "./meditree.js"

export type PlguinConfig = Record<string, any>

export const pluginTypes: Record<string, (config: PlguinConfig) => MeditreePlugin> = {}

export abstract class MeditreePlugin<TConfig = PlguinConfig> implements FileTreePlugin {
  readonly config: TConfig
  constructor(config: TConfig) {
    this.config = config
  }

  onRequestHandlerRegistering(app: Express.Application): void { }

  onMeditreeNodeCreated(node: MeditreeNode): void { }

  onPostGenerated(tree: FileTree): void { }
  /**
   * @param tree the entire file tree will be sent to the client soon.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeUpdated(tree: FileTree): FileTree { return tree }
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
