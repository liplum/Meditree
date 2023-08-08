import os from "os"
import path from "path"

const home = os.homedir()
export const appDir = path.join(home, ".meditree")

export function resolveAppStoragePath(_path: string): string {
  if (path.isAbsolute(_path)) return _path
  else return path.join(appDir, _path)
}
