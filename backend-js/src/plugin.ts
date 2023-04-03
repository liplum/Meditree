import { type FileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type MeditreeNode } from "./meditree.js"

export type PlguinConfig = Record<string, any>

export const pluginTypes: Record<string, (config: PlguinConfig) => MeditreePlugin> = {}

export class MeditreePlugin implements FileTreePlugin {
  readonly config: PlguinConfig
  constructor(config: PlguinConfig) {
    this.config = config
  }

  onRequestHandlerRegistering(app: Express.Application): void { }

  onMeditreeNodeCreated(node: MeditreeNode): void { }

  onPostGenerated(tree: FileTree): void { }
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
