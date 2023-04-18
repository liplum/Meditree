import { type MeditreePlugin } from "../server.js"
import fs from "fs"
type StatisticsPluginConfig = JsonBackend

interface JsonBackend {
  engine: "json"
  /**
   * The statistics json file.
   * "meditree-statistics.json" by default.
   */
  path?: string
}

type Statistics = Record<string, number>

export default function StatisticsPlugin(config: StatisticsPluginConfig): MeditreePlugin {
  if (config.engine === "json") {
    const file = config.path ?? "meditree-statistics.json"
    let statistics: Statistics
    return {
      async init() {
        statistics = fs.existsSync(file)
          ? JSON.parse(fs.readFileSync(file, "utf8")) ?? {}
          : {}
      },
      async onFileRequested(req, res, file) {
        const count = statistics[file.path]
        if (count === undefined) {
          statistics[file.path] = 1
        } else {
          statistics[file.path] = count + 1
        }
      },
      onExit() {
        fs.writeFileSync(file, JSON.stringify(statistics))
      },
    }
  } else {
    throw new Error(`engine "${config.engine as string}" in statistics plugin is not supported.`)
  }
}
