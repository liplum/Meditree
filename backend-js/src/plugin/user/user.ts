import { type PluginMeta } from "../../plugin"
import { type MeditreePlugin } from "../../server"
import { User } from "./user-storage"
declare global {
  namespace Express {
    interface Request {
      user: User
    }
  }
}

interface UserPluginConfig {
  
}

const UserPlugin: PluginMeta<MeditreePlugin, UserPluginConfig> = {
  depends: ["user-storage"],
  create() {
    return {
      setupMeta: (meta) => {
        meta.capabilities.push({
          name: "user",
          version: "v1",
        })
      },
      setupMeditree: async ({ app, manager, container, service }) => {
        app.get("/api/user/profile", (req, res) => {

        })

        app.post("/api/user/favorite", (req, res) => {

        })
      },
    }
  }
}
