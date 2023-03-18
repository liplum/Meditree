import fs from "fs"
import path from "path"
import { listenable, type ListenableValue } from "./foundation.js"
import chokidar from "chokidar"
export interface FindConfigArgs<T> {
  rootDir: string
  filename: string
  defaultConfig: T
}
export function findConfig<T>(args: FindConfigArgs<T>): ListenableValue<T> {
  const { rootDir, filename, defaultConfig } = args
  function readConfig(configFile: string): T {
    const config = Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configFile).toString()))
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
    return config
  }
  const curDir = rootDir
  let configFile = findFileInTree(curDir, filename)
  if (!configFile) {
    configFile = path.join(curDir, filename)
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2))
    throw new Error(`Configuration not found. ${configFile} is created.`)
  }
  const config = listenable(readConfig(configFile))
  chokidar.watch(configFile, {
    ignoreInitial: true,
  }).on("all", (event, filePath: string) => {
    console.log(`[${event}] Configuration was changed. ${filePath}`)
    try {
      config.value = readConfig(filePath)
    } catch (e) {
    }
  })

  return config
}

function findFileInTree(dir: string, fileName: string): string | null {
  let lastDir: string | null = null
  while (dir !== lastDir) {
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
