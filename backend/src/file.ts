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