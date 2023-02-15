import { dir } from 'console';
import * as fs from 'fs';
import * as path from 'path'

enum FileType {
  local = "local"
}

class File {
  type: FileType
  path: String
  constructor(type: FileType, path: String) {
    this.type = type
    this.path = path
  }
  static local(path: String): File {
    return new File(FileType.local, path)
  }
}

export function findFileInFileTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir != lastDir) {
    const configFile = path.join(dir, fileName)
    if (fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}

export class FileTree {
  path2File = new Map<string, FileTree | File>()
  resolve(path: string): File | null {
    return null
  }
  addFile(path: string, file: File | FileTree) {
    this.path2File[path] = file
  }
  static async subFileTreeFromAsync(direcotry: string): Promise<FileTree> {
    let stats = await lstatAsync(direcotry)
    if (!stats.isDirectory) {
      throw Error(`${path} isn't a directory`)
    }
    let tree = new FileTree()
    await this.iterateFilTreeAsync(tree, direcotry)
    return tree
  }

  private static async iterateFilTreeAsync(tree: FileTree, currentDirectory: string) {
    let files = await readdirAsync(currentDirectory)
    for (let file in files) {
      let stats = await lstatAsync(file)
      if (stats.isFile) {
        tree.addFile(file, File.local(file))
      }
      if (stats.isDirectory) {
        let tree = new FileTree()
        this.iterateFilTreeAsync(tree, file)
        tree.addFile(file, tree)
      }
    }
  }
}
async function lstatAsync(path: fs.PathLike): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(path, function (err, stats) {
      resolve(stats)
    })
  })
}

async function readdirAsync(direcotry: fs.PathLike): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(direcotry, function (err, files) {
      resolve(files)
    })
  })
}
