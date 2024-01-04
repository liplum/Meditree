import { type RequestHandler } from "express"
import { type FileTreeJson, iterateAllFiles, type PathedFile } from "../file.js"
import { type FileTreeManager } from "../manager.js"
import { type PluginMeta } from "../plugin.js"
import { TYPE, type MeditreePlugin } from "../server.js"
import { Random } from "random-js"

interface RandomPluginConfig {

}
/**
 * Minify plugin affects only file tree json for client side.
 */
const RandomPlugin: PluginMeta<MeditreePlugin, RandomPluginConfig> = {
  create(config) {
    const rand = new Random()
    let manager: FileTreeManager
    let authMiddleware: RequestHandler
    let indexedTree: IndexedTree
    return {
      async setupManager(_manager) {
        manager = _manager
        manager.on("file-tree-update", (entireTree) => {
          indexedTree = IndexedTree.from(entireTree)
        })
      },
      onRegisterService(container) {
        authMiddleware = container.get(TYPE.Auth)
      },
      async onRegisterExpressHandler(app) {
        app.get("/api/random", authMiddleware, (req, res) => {
          const randomFi = indexedTree.files[rand.integer(0, indexedTree.files.length)]
          const path = randomFi.fullPath
          console.log(path)
          res.redirect(`/api/file/${encodeURIComponent(path)}`)
        })
      },
    }
  }
}
export default RandomPlugin

class IndexedTree {
  files: PathedFile[]
  type2Files: Map<string, PathedFile[]>
  constructor(files: PathedFile[], type2Files: Map<string, PathedFile[]>) {
    this.files = files
    this.type2Files = type2Files
  }

  static from(tree: FileTreeJson): IndexedTree {
    const allFiles = Array.from(iterateAllFiles(tree)).filter(f => !f["*hide"])
    const type2Files = new Map<string, PathedFile[]>()
    for (const file of allFiles) {
      const type = file["*type"]
      let filesInType = type2Files.get(type)
      if (!filesInType) {
        filesInType = [] as PathedFile[]
        type2Files.set(type, filesInType)
      }
      filesInType.push(file)
    }
    return new IndexedTree(allFiles, type2Files)
  }
}
