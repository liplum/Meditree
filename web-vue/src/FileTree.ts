export interface FileSystemObject {
  parent?: DirectoryInfo
  name: string;
  hidden: boolean
}

export class FileInfo implements FileSystemObject {
  parent?: DirectoryInfo
  name: string
  type: string
  hidden: boolean = false
  path: string;
  url: string
  size?: string;

  toString(): string {
    return this.name
  }
}

export class DirectoryInfo implements FileSystemObject {
  parent?: DirectoryInfo
  name: string
  path: string
  hidden: boolean = false
  files = new Map<string, FileInfo | DirectoryInfo>

  toString(): string {
    return this.name
  }

  get isRoot(): boolean {
    return this.parent === undefined
  }

  addChild(file: FileInfo | DirectoryInfo): void {
    this.files.set(file.name, file)
    file.parent = this
  }

  find(path: string): FileInfo | DirectoryInfo | null {
    const parts = path.split("/")
    let cur: FileInfo | DirectoryInfo = this

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (cur instanceof DirectoryInfo) {
        const child = cur.files.get(part)
        if (!child) {
          return null
        }
        cur = child
      } else {
        // cur is a FileInfo, and we can't go any deeper.
        return null
      }
    }
    return cur
  }
}

interface FileEntry {
  "*tag"?: Record<string, number | string | boolean>
  "*hide"?: boolean
}

interface File extends FileEntry {
  "*type": string
  "*hide"?: boolean
  size?: string
}

interface Directory extends FileEntry {
  [name: string]: File | Directory | any
}

function* iterateFiles(tree: Directory): Iterable<[string, File | Directory]> {
  for (const entry of Object.entries(tree)) {
    if (entry[0] === "*hide" || entry[0] === "*tag") {
      continue
    }
    yield entry
  }
}

function parseFile(name: string, file: File, parent?: DirectoryInfo): FileInfo {
  const fi = new FileInfo()
  fi.parent = parent
  fi.name = name
  fi.type = file["*type"]
  fi.hidden = file["*hide"] || false
  fi.path = parent ? `${parent.path}/${name}` : name
  fi.url = `file/${fi.path}`
  fi.size = file.size
  return fi
}

function parseDirectory(name: string, directory: Directory, parent?: DirectoryInfo): DirectoryInfo {
  const dir = new DirectoryInfo()
  dir.name = name
  dir.parent = parent
  dir.path = parent && !parent.isRoot ? `${parent.path}/${name}` : name
  dir.hidden = directory["*hide"] || false
  for (const [name, file] of iterateFiles(directory)) {
    const tag = file["*tag"]
    if (file.hasOwnProperty("*type")) {
      // Parse as file
      dir.addChild(parseFile(name, file as File, dir))
    } else {
      // Parse as directory
        const subDir = parseDirectory(name, file as Directory, dir)
        dir.addChild(subDir)
    }
  }
  return dir
}

export function parseFileTree(tree: { name: string, root: Directory }): DirectoryInfo {
  return parseDirectory(tree.name, tree.root)
}
