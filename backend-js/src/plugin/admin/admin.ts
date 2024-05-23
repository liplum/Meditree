import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express, { RequestHandler } from "express"
import multer from "multer"

interface AdminPluginConfig {
  /**
  * The root directory where to save the uploaded files.
  */
  storageRoot?: string
  /** 
   * Maximum size of each form field value in bytes. 
   * 1048576 by default
   */
  maxFileSize?: number
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
        const authMiddleware = container.get(AdminPluginType.Auth)
        const admin = express.Router()
        admin.use(authMiddleware)
        
        const storage = multer.diskStorage({
          destination: config.storageRoot,
        })
        const upload = multer({
          storage, limits: {
            fieldSize: config.maxFileSize,
          }
        })
        admin.route("/file")
          .put(upload.single("file"), (req, res) => {
            req.file
          })
          .delete((req, res) => {

          })
        api.use("/admin", admin)
      },
    }
  }
}
export default AdminPlugin
