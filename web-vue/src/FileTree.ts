import { FileInfo, DirectoryInfo, extractFromDirectory, isFile, isDirectory, DirectoryTag, getSubfile } from "@meditree/model";
export interface FileSystemObject {
  parent?: DirectoryObject
  name: string;
  hidden: boolean
}

export class FileObject implements FileSystemObject {
  parent?: DirectoryObject
  name: string
  type: string
  hidden: boolean = false
  path: string;
  url: string
  size?: number;

  toString(): string {
    return this.name
  }
}

export class DirectoryObject implements FileSystemObject {
  parent?: DirectoryObject
  name: string
  path: string
  hidden: boolean = false
  files = new Map<string, FileObject | DirectoryObject>

  toString(): string {
    return this.name
  }

  get isRoot(): boolean {
    return this.parent === undefined
  }

  addChild(file: FileObject | DirectoryObject): void {
    this.files.set(file.name, file)
    file.parent = this
  }

  find(path: string): FileObject | DirectoryObject | null {
    const parts = path.split("/")
    let cur: FileObject | DirectoryObject = this

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (cur instanceof DirectoryObject) {
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

function parseFile(name: string, file: FileInfo, parent?: DirectoryObject): FileObject {
  const fi = new FileObject()
  fi.parent = parent
  fi.name = name
  fi.type = file["*type"]
  fi.hidden = file["*hide"] || false
  fi.path = parent ? `${parent.path}/${name}` : name
  fi.url = `/api/file/${fi.path}`
  fi.size = file.size
  return fi
}

function parseDirectory(name: string, directory: DirectoryInfo, parent?: DirectoryObject): DirectoryObject {
  const dir = new DirectoryObject()
  dir.name = name
  dir.parent = parent
  dir.path = parent && !parent.isRoot ? `${parent.path}/${name}` : name
  dir.hidden = directory["*hide"] || false
  for (const [name, file] of extractFromDirectory(Object.entries(directory))) {
    if (isFile(file)) {
      // Parse as file
      dir.addChild(parseFile(name, file, dir))
    } else if (isDirectory(file)) {
      // Parse as directory
      // if it has an entry point.
      const mainName = file["*tag"]?.[DirectoryTag.main]
      const mainFi = getSubfile(file, mainName)
      if (mainName && mainFi) {
        const fi = new FileObject()
        fi.parent = dir
        fi.name = name
        fi.type = mainFi["*type"]
        fi.hidden = file["*hide"] || false
        fi.path = `${dir.path}/${name}`
        fi.url = `/api/file/${dir.path}/${name}/${mainName}`
        fi.size = mainFi.size
        dir.addChild(fi)
      } else {
        const subDir = parseDirectory(name, file, dir)
        dir.addChild(subDir)
      }
    }
  }
  return dir
}

export function parseFileTree(tree: { name: string, root: DirectoryInfo }): DirectoryObject {
  return parseDirectory(tree.name, tree.root)
}
