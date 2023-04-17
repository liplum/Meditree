import { type Server } from "http"
import { type Readable } from "stream"
import { type ResolvedFile, type FileTree, type LocalFileTree } from "./file.js"
import { type FileTreePlugin } from "./host.js"
import { type ReadStreamOptions, type MeditreeNode } from "./meditree.js"
import { type RequestHandler, type Express, type Request, type Response } from "express"
import fs from "fs"
import { pathToFileURL } from "url"
import { type Container } from "@owja/ioc"

export type PluginRegistry = Record<string, (config: any) => MeditreePlugin>

export interface MeditreePlugin extends FileTreePlugin {
  registerService?(container: Container): void

  init?(): Promise<void>

  setupServer?(app: Express.Application, server: Server): Promise<void>

  setupMeditreeNode?(node: MeditreeNode): Promise<void>

  onExpressRegistering?(app: Express, ctx: ExpressRegisteringContext): Promise<void>

  onPostGenerated?(tree: LocalFileTree): void

  /**
   * @param tree the entire file tree will be sent to both clients and parent nodes.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeUpdated?(tree: FileTree): FileTree

  /**
   * @param tree the entire file tree will be sent to clients soon.
   * @returns a new file tree or the same instance.
   */
  onEntireTreeForClient?(tree: FileTree): FileTree
  /**
   * The first plugin which returns a non-undefined value will be taken.
   * @returns undefined if not handled by this plugin.
   */
  onNodeCreateReadStream?(node: MeditreeNode, file: ResolvedFile, options?: ReadStreamOptions): Promise<Readable | null | undefined>

  /**
   * @returns whether to prevent streaming {@link file}.
   */
  onFileRequested?(req: Request, res: Response, file: ResolvedFile): Promise<void> | Promise<boolean | undefined>
  onExit?(): void
}
export interface ExpressRegisteringContext {
  passcodeHandler: RequestHandler
}

export async function resolvePlguinFromConfig(
  all: PluginRegistry,
  config: Record<string, Record<string, any>>,
  onFound?: (name: string, plugin: MeditreePlugin) => void,
  onNotFound?: (name: string) => void,
): Promise<MeditreePlugin[]> {
  const plugins: MeditreePlugin[] = []
  for (const [name, pluginConfig] of Object.entries(config)) {
    const ctor = all[name]
    if (ctor) {
      // for built-in plugins
      const plugin = ctor(typeof pluginConfig === "object" ? pluginConfig : {})
      plugins.push(plugin)
      onFound?.(name, plugin)
    } else if (fs.existsSync(name)) {
      // for external plugins
      const pluginModule = await importModule(name)
      // external plugins default export their constructors.
      const plugin = pluginModule.default(pluginConfig)
      plugins.push(plugin)
      onFound?.(name, plugin)
    } else {
      onNotFound?.(name)
    }
  }
  return plugins
}

async function importModule(filePath: string): Promise<any> {
  if (filePath.startsWith("file://")) {
    // If the filePath starts with "file://", assume it is a file URI
    const url = new URL(filePath)
    if (!fs.existsSync(url.pathname)) {
      throw new Error(`File not found: ${url.pathname}`)
    }
    return import(url.toString())
  } else {
    // Otherwise, assume it is a file path
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    return import(pathToFileURL(filePath).toString())
  }
}
