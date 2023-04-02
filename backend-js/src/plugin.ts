import { type FileTreePlugin } from "./host.js"

export type PlguinConfig = Record<string, any>

export const pluginTypes: Record<string, (config: PlguinConfig) => MeditreePlugin> = {}

export interface MeditreePlugin extends FileTreePlugin {

}

export function resolvePlguinFromConfig(config: Record<string, Record<string, any>>): MeditreePlugin[] {
  const plugins = []
  for (const [name, pluginConfig] of Object.entries(config)) {
    const ctor = pluginTypes[name]
    if (ctor) {
      ctor(pluginConfig)
    } else {
      console.log(`Plugin[${name}] doesn't exist.`)
    }
  }
  return plugins
}
