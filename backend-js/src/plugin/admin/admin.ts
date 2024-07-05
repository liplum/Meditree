import { type PluginMeta } from "../../plugin.js"
import { type MeditreePlugin } from "../../server.js"
import express from "express"
import multer from "multer"
import { createLogger } from "@liplum/log"
import os from "os"
import { LocalFileTree, resolveFile, resolveFileTree, splitPath } from "../../file.js"
import filenamify from 'filenamify'
import p from "path"
import fs from "fs/promises"
import { validateRequest } from 'zod-express-middleware'
import { z } from "zod"
import { parseBytes } from "../../utils.js"

interface AdminPluginConfig {
  /**
  * The root directory where to save the uploaded files temporarily.
  * By default, {@link os.tmpdir} will be used.
  */
  tempDir?: string
  /** 
   * Maximum size of each form field value in bytes. 
   * 1048576 by default
   */
  maxFileSize?: string | number

  
  trashBin?: boolean
}

const AdminPlugin: PluginMeta<MeditreePlugin, AdminPluginConfig> = {
  create(config) {
    const log = createLogger("Admin")
    let tempDir = config.tempDir
    return {
      setupMeditree: async ({ api, manager, middlewares, service }) => {
        const authMiddlewares = middlewares.byName("auth-admin")
        const admin = express.Router()
        if (authMiddlewares.length) {
          admin.use(...authMiddlewares)
        } else {
          log.warn(`Critical Security Risk: the Meditree server lacks an admin authentication method. This means anyone can access, modify, or delete your files! This message is only intended for testing purposes on a private network. Do not deploy a server without proper authentication in production. To setup an authentication method, for example, configure Meditree and add a plugin, "admin-auth-token"`)
        }

        const storage = multer.diskStorage({
          destination: tempDir
        })
        const upload = multer({
          storage, limits: {
            fileSize: parseBytes(config.maxFileSize, 1048576),
          }
        })

        admin.route("/file")
          .put(validateRequest({
            query: z.object({
              dir: z.string().optional(),
              name: z.string().optional(),
            })
          }), upload.single("file"), async (req, res) => {
            const file = req.file
            if (!file) {
              res.status(500).send("Uploaded file not found")
              return
            }
            let dir = req.query.dir ?? ""
            try {
              dir = decodeURIComponent(dir)
            } catch (e) {
              res.status(400).send("Invalid path")
              return
            }
            const pathParts = splitPath(dir)
            let mostRecentTree: LocalFileTree | undefined
            let end: number
            for (end = Math.max(0, pathParts.length - 1); end >= 0; end--) {
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
            const filename = filenamify(req.query.name ?? file.originalname, { replacement: "-" })

            try {
              await fs.mkdir(dirPath, { recursive: true })
            } catch (error) {
              log.error(`Failed to create directory: ${dirPath}`, error)
              res.status(500).send("Failed to create directory")
              return
            }
            const newFilePath = p.join(dirPath, filename)
            try {
              await fs.rename(file.path, newFilePath)
            } catch (error) {
              log.error(`Failed to move file: ${file.path} => ${newFilePath}`, error)
              res.status(500).send("Failed to put such file")
              return
            }
            log.verbose(`An uploaded file saved at ${newFilePath}`)
            res.sendStatus(200).end()
            // eagerly rebuild file tree after file uploaded
            service.rebuildFileTree()
          })
          .delete(validateRequest({
            query: z.object({
              path: z.string(),
            })
          }), async (req, res) => {
            let path = req.query.path
            try {
              path = decodeURIComponent(path)
            } catch (e) {
              res.status(400).send("Invalid path")
              return
            }
            const file = resolveFile(manager, path)
            if (!file) {
              res.status(404).send("No such file")
              return
            }
            try {
              await fs.unlink(file.localPath)
            } catch (error) {
              log.error(`Failed to delete file: ${file.localPath}`, error)
              res.status(500).send("Failed to delete file")
              return
            }
            log.verbose(`Deleted file: ${path} at ${file.localPath}`)
            res.sendStatus(200).end()
            // eagerly rebuild file tree after file deleted
            service.rebuildFileTree()
          })
        api.use("/admin", admin)
      },
    }
  }
}
export default AdminPlugin
