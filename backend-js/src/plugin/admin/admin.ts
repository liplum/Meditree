import { token } from "@liplum/ioc"
import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express, { RequestHandler } from "express"
import multer from "multer"
import { createLogger } from "@liplum/log"
import { AppConfig } from "../../config.js"
import os from "os"
import { FileTreeLike, LocalFileTree, resolveFileTree, splitPath } from "../../file.js"
import filenamify from 'filenamify'
import p from "path"
import fs from "fs/promises"

interface AdminPluginConfig {
  /**
  * The root directory where to save the uploaded files temporarily.
  * By default,
  * if {@link AppConfig.root} is a string, that will be used,
  * either {@link os.tmpdir} will be used.
  */
  tempDir?: string
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
    let tempDir = config.tempDir
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
          destination: tempDir
        })
        const upload = multer({
          storage, limits: {
            fieldSize: config.maxFileSize,
          }
        })
        admin.route("/file")
          .put(upload.single("file"), async (req, res) => {
            const file = req.file
            if (!file) {
              res.status(500).send("Uploaded file not found")
              return
            }
            let dir = `${req.query.dir}`
            try {
              dir = decodeURIComponent(dir)
            } catch (e) {
              res.status(400).send("Invalid path")
              return
            }
            const pathParts = splitPath(dir)
            let mostRecentTree: LocalFileTree | undefined
            let end: number
            for (end = pathParts.length - 1; end >= 0; end--) {
              const tree = resolveFileTree(manager, pathParts.slice(0, end))
              if (tree instanceof LocalFileTree) {
                mostRecentTree = tree
                break
              }
            }

            if (!mostRecentTree) {
              res.status(400).send("The given directory cannot be created")
              return
            }
            const pathPartsRemaining = pathParts.slice(end, pathParts.length).map((path) => filenamify(path, { replacement: "-" }))
            const dirPath = p.join(mostRecentTree.path, ...pathPartsRemaining)
            const filename = filenamify(`${req.query.name}` ?? file.originalname, { replacement: "-" })

            try {
              await fs.mkdir(dirPath, { recursive: true })
            } catch (error) {
              log.error(`Cannot create directory: ${dirPath}`, error)
              res.status(500).send("Cannot create directory")
              return
            }
            const newFilePath = p.join(dirPath, filename)
            try {
              await fs.rename(file.path, newFilePath)
            } catch (error) {
              log.error(`Cannot move file: ${file.path} => ${newFilePath}`, error)
              res.status(500).send("Cannot put such file")
              return
            }
            log.verbose(`An uploaded file saved at ${newFilePath}`)
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
