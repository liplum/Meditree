import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express, { RequestHandler } from "express"
import multer from "multer"
import { createLogger } from "@liplum/log"

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
  Auth: token<RequestHandler>("meditree.Admin.Auth"),
}

const AdminPlugin: PluginMeta<MeditreePlugin, AdminPluginConfig> = {
  create(config) {
    const log = createLogger("Admin")
    return {
      setupMeditree: async ({ api, manager, container, service }) => {
        const authMiddleware = container.tryGet(AdminPluginType.Auth)
        const admin = express.Router()
        if (authMiddleware) {
          admin.use(authMiddleware)
        } else {
          log.warn(`Critical Security Risk: the Meditree server lacks an admin authentication method. This means anyone can access, modify, or delete your files! This message is only intended for testing purposes on a private network. Do not deploy a server without proper authentication in production. To setup an authentication method, for example, configure Meditree and add a plugin, "admin-auth-token"`)
        }

        const storage = multer.diskStorage({
          // destination: (req, file, callback) => {
          //   let path = `${req.query.path}`
          //   try {
          //     path = decodeURIComponent(path)
          //   } catch (e) {
          //     callback(new Error("Invalid path"), os.tmpdir())
          //     return
          //   }
          //   callback(null, os.tmpdir())
          //   // manager.resolveFileFromFull(path)
          // },
          // filename: (req, file, callback) => {
          // }
        })
        const upload = multer({
          storage, limits: {
            fieldSize: config.maxFileSize,
          }
        })
        admin.route("/file")
          .put(upload.single("file"), (req, res) => {
            res.sendStatus(200).end()
          })
          .delete((req, res) => {
            res.sendStatus(200).end()
          })
        api.use("/admin", admin)
      },
    }
  }
}
export default AdminPlugin
