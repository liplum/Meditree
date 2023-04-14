export interface FileSystemEntry {
  parent?: DirectoryInfo
  name: string;
  hidden: boolean
}
export class FileInfo implements FileSystemEntry {
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

export class DirectoryInfo implements FileSystemEntry {
  parent?: DirectoryInfo
  name: string
  path: string
  hidden: boolean = false
  files: (FileInfo | DirectoryInfo)[] = []

  toString(): string {
    return this.name
  }

  get isRoot(): boolean {
    return this.parent === undefined
  }
}

interface File {
  "*type": string;
  "*hide"?: boolean;
  path?: string;
  size?: string;
}

interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}

export function parseFileTree(baseUrl: string, tree: { name: string, root: Directory }): DirectoryInfo {

  function parseFile(name: string, file: File, parent?: DirectoryInfo): FileInfo {
    const fi = new FileInfo();
    fi.parent = parent;
    fi.name = name;
    fi.type = file["*type"];
    fi.hidden = file["*hide"] || false;
    fi.path = file.path ??
      (parent ? `${parent.path}/${name}` : name)
    fi.url = `${baseUrl}/${fi.path}`
    fi.size = file.size;
    return fi;
  }

  function parseDirectory(name: string, directory: Directory, parent?: DirectoryInfo): DirectoryInfo {
    const dir = new DirectoryInfo();
    dir.name = name;
    dir.parent = parent;
    dir.path = parent && !parent.isRoot ? `${parent.path}/${name}` : name
    dir.hidden = directory["*hide"] || false;
    for (const [name, file] of Object.entries(directory)) {
      if (name === "*hide") continue
      if (file.hasOwnProperty("*type")) {
        // Parse as file
        dir.files.push(parseFile(name, file as File, dir));
      } else {
        // Parse as directory
        dir.files.push(parseDirectory(name, file as Directory, dir))
      }
    }
    return dir;
  }

  return parseDirectory(tree.name, tree.root)
}