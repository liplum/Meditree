/* eslint-disable @typescript-eslint/no-misused-promises */
import { type Request } from "express"
import { type FileTreeLike, iterateAllFilesInTree, type LocalFile } from "../file.js"
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
   *  - redirect: redirect to a new url
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
      setupMeta(meta) {
        meta.capabilities.push({
          name: "random",
          version: "v1",
        })
      },
      async setupMeditree({ app, manager, container, service }) {
        const authMiddleware = container.get(TYPE.Auth)
        manager.on("file-tree-update", ({ tree }) => {
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
          res.contentType(randomFi.type)
          switch (getMode(randomFi.type)) {
            case "redirect":
              res.redirect(`/api/file/${encodeURIComponent(randomFi.virtualPath)}`)
              break
            case "pipe":
              await service.pipeFile(req, res, randomFi)
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
          res.json({
            ...randomFi.toJSON(),
            path: randomFi.virtualPath,
          })
          res.end()
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

  random(rand: Random, types?: string[]): LocalFile | undefined {
    if (!types?.length) {
      return this.files[rand.integer(0, this.files.length)]
    }
    let all: LocalFile[] = []
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
