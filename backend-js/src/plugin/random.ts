/* eslint-disable @typescript-eslint/no-misused-promises */
import { type RequestHandler } from "express"
import { type FileTreeJson, iterateAllFilesInTreeJson, type PathedFile, type FileTreeLike, iterateAllFilesInTree, type LocalFile } from "../file.js"
import { type FileTreeManager } from "../manager.js"
import { type PluginMeta } from "../plugin.js"
import { TYPE, type MeditreePlugin } from "../server.js"
import { Random } from "random-js"

interface RandomPluginConfig {
  /**
   * Allowed file type for random get.
   * ### Pattern
   * type: object
   * key: file type name. It will be checked by `string.includes` under the hood.
   * value: the serve mode
   *  - rediret: redirect to a new url
   *  - pipe: directly pipe file
   */
  types?: Record<string, "redirect" | "pipe">
}
/**
 * Minify plugin affects only file tree json for client side.
 */
const RandomPlugin: PluginMeta<MeditreePlugin, RandomPluginConfig> = {
  create(config) {
    const types = config.types ?? {
      video: "redirect",
      image: "pipe"
    }
    const rand = new Random()
    let indexedTree: IndexedTree
    return {
      async setupMeditree({ app, manager, container, service }) {
        const authMiddleware = container.get(TYPE.Auth)
        manager.on("file-tree-update", () => {
          indexedTree = IndexedTree.from(manager)
        })
        app.get("/api/random", authMiddleware, async (req, res) => {
          const randomFi = indexedTree.files[rand.integer(0, indexedTree.files.length)]
          res.contentType(randomFi.type)
          await service.pipeFile(req, res, randomFi)
          // const path = randomFi.fullPath
          // console.log(path)
          // pipeFile({req,res,file:randomFi, plugins})
          // res.redirect(`/api/file/${encodeURIComponent(path)}`)
        })
      },
    }
  }
}
export default RandomPlugin

class IndexedTree {
  files: LocalFile[]
  type2Files: Map<string, LocalFile[]>
  constructor(files: LocalFile[], type2Files: Map<string, LocalFile[]>) {
    this.files = files
    this.type2Files = type2Files
  }

  static from(tree: FileTreeLike): IndexedTree {
    const allFiles = Array.from(iterateAllFilesInTree(tree)).filter(f => !f.hidden)
    const type2Files = new Map<string, LocalFile[]>()
    for (const file of allFiles) {
      const type = file.type
      let filesInType = type2Files.get(type)
      if (!filesInType) {
        filesInType = [] as LocalFile[]
        type2Files.set(type, filesInType)
      }
      filesInType.push(file)
    }
    return new IndexedTree(allFiles, type2Files)
  }
}
