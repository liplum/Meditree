export class FileInfo {
  parent?: DirectoryInfo
  name: string
  type: string
  hidden: boolean = false
  path: string;
  size?: string;
}

export class DirectoryInfo {
  parent?: DirectoryInfo
  name: string
  hidden: boolean = false
  files: (FileInfo | DirectoryInfo)[] = []
}

interface File {
  "*type": string;
  "*hide"?: boolean;
  path: string;
  size?: string;
}

interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}

function parseFile(name: string, file: File, parent?: DirectoryInfo): FileInfo {
  const fi = new FileInfo();
  fi.parent = parent;
  fi.name = name;
  fi.type = file["*type"];
  fi.hidden = file["*hide"] || false;
  fi.path = file.path;
  fi.size = file.size;
  return fi;
}

function parseDirectory(name: string, directory: Directory, parent?: DirectoryInfo): DirectoryInfo {
  const dir = new DirectoryInfo();
  dir.name = name;
  dir.parent = parent;
  dir.hidden = directory["*hide"] || false;
  const files: (FileInfo | DirectoryInfo)[] = []
  for (const [name, file] of Object.entries(directory)) {
    if (name === "*hide") continue
    if (file.hasOwnProperty("*type")) {
      // Parse as file
      files.push(parseFile(name, file as File, dir));
    } else {
      // Parse as directory
      files.push(parseDirectory(name, file as Directory, dir))
    }
  }
  return dir;
}

export function parseFileTree(tree: { name: string, files: Directory }): DirectoryInfo {
  return parseDirectory(tree.name, tree.files)
}