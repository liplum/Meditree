import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express, { RequestHandler } from "express"
import { UploadPluginType } from "../upload.js"

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
      setupMeditree: async ({ api, manager, container, service }) => {
        const admin = express.Router()
        api.use("/admin", admin)
        const authMiddleware = container.get(AdminPluginType.Auth)
        const uploadService = container.get(UploadPluginType.Serivce)
        admin.use(authMiddleware)
        admin.route("/file")
          .put(uploadService.upload.single("file"), (req, res) => {
            req.file
          })
          .delete((req, res) => {

          })
      },
    }
  }
}
export default AdminPlugin
