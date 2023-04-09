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
  directoryInfo.files = Object.keys(directory)
    .filter((key) => key !== "*hide")
    .map((key) => {
      const entry = directory[key];
      if (entry.hasOwnProperty("*type")) {
        // Parse as file
        return parseFile(key, entry as File);
      } else {
        // Parse as directory
        return parseDirectory(key, entry as Directory);
      }
    });
  return directoryInfo;
}