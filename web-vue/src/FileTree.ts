export class FileInfo {
  name: string
  type: string
  hidden: boolean = false
  path: string;
  size?: string;
}

export class DirectoryInfo {
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

function parseFile(name: string, file: File): FileInfo {
  const fileInfo = new FileInfo();
  fileInfo.name = name;
  fileInfo.type = file["*type"];
  fileInfo.hidden = file["*hide"] || false;
  fileInfo.path = file.path;
  fileInfo.size = file.size;
  return fileInfo;
}

function parseDirectory(name: string, directory: Directory): DirectoryInfo {
  const directoryInfo = new DirectoryInfo();
  directoryInfo.name = name;
  directoryInfo.hidden = directory["*hide"] || false;
  const files: (FileInfo | DirectoryInfo)[] = []
  for (const [name, file] of Object.entries(directory)) {
    if (name === "*hide") continue
    if (file.hasOwnProperty("*type")) {
      // Parse as file
      files.push(parseFile(name, file as File));
    } else {
      // Parse as directory
      files.push(parseDirectory(name, file as Directory))
    }
  }
  return directoryInfo;
}

export function parseFileTree(tree: { name: string, files: Directory }): DirectoryInfo {
  return parseDirectory(tree.name, tree.files)
}