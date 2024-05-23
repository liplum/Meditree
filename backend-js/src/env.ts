import os from "os"
import p from "path"
import fs from "fs"

const home = os.homedir()
export const appDir = p.join(home, ".meditree")

export const resolveAppStoragePath = (path: string): string => {
  if (p.isAbsolute(path)) return path
  else return p.join(appDir, path)
}

export const existsOrNull = (path: string): string | null => {
  if (fs.existsSync(path)) return path
  else return null
}
