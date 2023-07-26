import { type MeditreePlugin } from "../server.js"

export const HLSMediaType = "application/x-mpegURL"
interface HLSPluginConfig {
  
}
export default function HLSPlugin(config: HLSPluginConfig): MeditreePlugin {
  return {
    onLocalFileTreeRebuilt(tree) {
      for (const file of tree.visitFile({
        fileFilter: (f) => f.type === HLSMediaType,
        dirFilter: (d) => d.tag?.icon === undefined,
      })) {
        const dir = file.parent
        dir.tag ??= {}
        dir.tag.icon = file.name
      }
    }
  }
}
