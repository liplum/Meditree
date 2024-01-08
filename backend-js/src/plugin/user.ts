import { type PluginMeta } from "../plugin"
import { type MeditreePlugin } from "../server"

interface UserPluginConfig {
  
}

const UserPlugin: PluginMeta<MeditreePlugin, UserPluginConfig> = {
  depends: ["user-storage"],
  create() {
    return {

    }
  }
}
