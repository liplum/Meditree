import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express, { RequestHandler } from "express"

interface AdminPluginConfig {

}

export const AdminPluginType = {
  Auth: token<RequestHandler>("net.liplum.Admin.Auth"),
}

const AdminPlugin: PluginMeta<MeditreePlugin, AdminPluginConfig> = {
  create(config) {
    return {
      setupService: (container) => {
        container.bind(AdminPluginType.Auth).toValue((_, __, next) => {
          next()
        })
      },
      setupMeditree: async ({ api, manager, upload, container, service }) => {
        const admin = express.Router()
        api.use("/admin", admin)
        const authMiddleware = container.get(AdminPluginType.Auth)
        admin.use(authMiddleware)
        admin.route("/file")
          .put(upload.single("file"), (req, res) => {
            req.file
          })
          .delete((req, res) => {

          })
      },
    }
  }
}
export default AdminPlugin
