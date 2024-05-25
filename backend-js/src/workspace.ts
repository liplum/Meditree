import p from "path";
import { MeditreeConfig, loadConfigFromFile, setupConfig } from "./config";
import { appDir, existsOrNull } from "./env";
import { LogLevel, globalOptions, initGlobalLogDir } from "@liplum/log";

export class MeditreeWorkspace {
  readonly workspacePath: string
  readonly logLevel: LogLevel

  constructor({ path, logLevel }: {
    path: string, logLevel: LogLevel
  }) {
    this.workspacePath = path
    this.logLevel = logLevel
  }

  async initLogger() {
    initGlobalLogDir(this.logDir)
    globalOptions.consoleOutputRequired = this.logLevel
  }

  async loadConfig(): Promise<MeditreeConfig | undefined> {
    const configPath = existsOrNull(p.join(this.workspacePath, "config.yaml"))
      ?? existsOrNull(p.join(this.workspacePath, "config.yml"))
      ?? p.join(this.workspacePath, "config.json")
    const config = await loadConfigFromFile(configPath)
    return config
  }

  get logDir(): string {
    return p.join(this.workspacePath, "log")
  }
}