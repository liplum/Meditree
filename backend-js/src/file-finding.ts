import fs from "fs"
import path from "path"

export function findFSOInTreeByName(root: string, fileName: string): string | null {
  return findFSOInTree(root, (dir) => path.join(dir, fileName))
}

export function findFSOInTree(root: string, attemp: (dir: string) => string | undefined | null): string | null {
  let dir = root
  let lastDir: string | null = null
  while (dir !== lastDir) {
    const configFile = attemp(dir)
    if (configFile && fs.existsSync(configFile)) {
      return configFile
    } else {
      lastDir = dir
      dir = path.dirname(dir)
    }
  }
  return null
}

/**
 * List the existing ancestor directories based on {@link root} given,
 * starting with the nearest ancestor,
 * and ending with the root directory of file system.

 * @param root the root directory path to search
 * @returns a list of all existing ancestors.
 */
export function listAncestors(root: string): string[] {
  const ancestors: string[] = []
  let dir = root
  let lastDir: string | null = null
  while (dir !== lastDir) {
    if (fs.existsSync(dir)) {
      ancestors.push(dir)
    }
    lastDir = dir
    dir = path.dirname(dir)
  }
  return ancestors
}
