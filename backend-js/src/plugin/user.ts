import { type PluginMeta } from "../plugin"
import { type MeditreePlugin } from "../server"

interface UserPluginConfig {

}

const UserPlugin: PluginMeta<MeditreePlugin, UserPluginConfig> = {
  depends: ["user-storage"],
  create() {
    return {
      setupMeta(meta) {
        meta.capabilities.push({
          name: "user",
          version: "v1",
        })
      },
      async setupMeditree({ app, manager, container, service }) {
        app.get("/api/user/profile", (req, res) => {

        })

        app.post("/api/user/favorite", (req, res) => {
          
        })
      },
    }
  }
}
