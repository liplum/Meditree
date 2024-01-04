/* eslint-disable @typescript-eslint/no-misused-promises */
import { type Request } from "express"
import { type FileTreeJson, iterateAllFilesInTreeJson, type PathedFile } from "../file.js"
import { type PluginMeta } from "../plugin.js"
import { TYPE, type MeditreePlugin } from "../server.js"
import { Random } from "random-js"

type ServeMode = "redirect" | "pipe"

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
  types?: Record<string, ServeMode> | ServeMode
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
    function getMode(fileType: string): ServeMode {
      if (typeof types === "string") {
        return types
      }
      for (const [typeTest, mode] of Object.entries(types)) {
        if (fileType.includes(typeTest)) {
          return mode
        }
      }
      return "pipe"
    }
    const rand = new Random()
    let indexedTree: IndexedTree
    return {
      async setupMeditree({ app, manager, container, service }) {
        const authMiddleware = container.get(TYPE.Auth)
        manager.on("file-tree-update", (tree) => {
          indexedTree = IndexedTree.from(tree)
        })
        function resolveTypes(req: Request): string[] {
          const targetType = req.query.type
          let types: string[] = []
          if (typeof targetType === "string") {
            types.push(targetType)
          } else if (Array.isArray(targetType)) {
            types = types.concat(targetType as string[])
          }
          return types
        }
        app.get("/api/random-file", authMiddleware, async (req, res) => {
          const randomFi = indexedTree.random(rand, resolveTypes(req))
          if (!randomFi) {
            return res.sendStatus(404).end()
          }
          const pathParts = randomFi.fullPath.split("/")
          const file = manager.resolveFile(pathParts)
          if (!file) {
            return res.sendStatus(404).end()
          }
          res.contentType(file.type)
          switch (getMode(file.type)) {
            case "redirect":
              res.redirect(`/api/file/${encodeURIComponent(randomFi.fullPath)}`)
              break
            case "pipe":
              await service.pipeFile(req, res, file)
              break
            default:
              return res.sendStatus(400).end()
          }
        })

        app.get("/api/random-info", (req, res) => {
          const randomFi = indexedTree.random(rand, resolveTypes(req))
          if (!randomFi) {
            return res.sendStatus(404).end()
          }
          res.json(randomFi)
          res.end()
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
    const allFiles = Array.from(iterateAllFilesInTreeJson(tree)).filter(f => !f["*hide"])
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

  random(rand: Random, types?: string[]): PathedFile | undefined {
    if (!types?.length) {
      return this.files[rand.integer(0, this.files.length)]
    }
    let all: PathedFile[] = []
    for (const [type, file] of this.type2Files.entries()) {
      for (const typeTest of types) {
        if (type.includes(typeTest)) {
          all = all.concat(file)
        }
      }
    }
    return all[rand.integer(0, all.length)]
  }
}
