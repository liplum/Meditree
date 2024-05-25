import p from "path";
import { MeditreeConfig, loadConfigFromFile, setupConfig } from "./config";
import { appDir, existsOrNull } from "./env";

export class MeditreeWorkspace {
  readonly workspacePath: string

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  async initLogger() {

  }

  async loadConfig(): Promise<MeditreeConfig> {
    const configPath = existsOrNull(p.join(this.workspacePath, "config.yaml"))
      ?? existsOrNull(p.join(this.workspacePath, "config.yml"))
      ?? p.join(this.workspacePath, "config.json")
    const config = await loadConfigFromFile(configPath)
    return config ?? setupConfig()
  }
}