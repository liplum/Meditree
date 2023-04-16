import { type MeditreePlugin } from "../plugin.js"

interface WatchPluginConfig {
  rebuildInterval: number
}
/**
 * Watch plugin will watch the root directory changing and frequently rebuild the local file tree.
 */
export default function WatchPlugin(config: WatchPluginConfig): MeditreePlugin {
  return {

  }
}
