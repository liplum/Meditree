import fs from "fs"
import path from "path"
import chalk, { type ChalkInstance } from "chalk"
import { format } from "util"
export interface LogLevel {
  signal: string
  level: number
  color?: ChalkInstance
}

export function createLogLevel(
  signal: string,
  level: number,
  color?: ChalkInstance,
): LogLevel {
  return {
    signal,
    level,
    color,
  }
}

export function extendsLogLevel(parent: LogLevel, override: Partial<LogLevel>): LogLevel {
  return { ...parent, ...override }
}

export const LogLevels = {
  ERROR: createLogLevel("ERROR", 100, chalk.bold.red),
  WARN: createLogLevel("WARN", 50, chalk.yellow),
  INFO: createLogLevel("INFO", 20, chalk.green),
  DEBUG: createLogLevel("DEBUG", 10, chalk.blue),
  VERBOSE: createLogLevel("VERBOSE", 1),
}

export const globalOptions: {
  logFile?: string
  consoleLevel: LogLevel
} = {
  logFile: undefined,
  consoleLevel: LogLevels.INFO,
}

export function initGlobalLogFile(direcotry: string): void {
  fs.mkdirSync(direcotry, { recursive: true })
  globalOptions.logFile = path.join(
    direcotry,
    `${new Date().toISOString().slice(0, 10)}.log`
  )
}
export interface Logger {
  error(message: string | object): void
  warn(message: string | object): void
  info(message: string | object): void
  debug(message: string | object): void
  verbose(message: string | object): void
  log(level: LogLevel, message: string | object): void
}

export function createLogger(channel?: string): Logger {
  return new LoggerImpl(channel,)
}

class LoggerImpl implements Logger {
  private readonly channel?: string

  constructor(channel?: string) {
    this.channel = channel
  }

  error = (message: string | object): void => {
    this.log(LogLevels.ERROR, message)
  }

  warn = (message: string | object): void => {
    this.log(LogLevels.WARN, message)
  }

  info = (message: string | object): void => {
    this.log(LogLevels.INFO, message)
  }

  debug = (message: string | object): void => {
    this.log(LogLevels.DEBUG, message)
  }

  verbose = (message: string | object): void => {
    this.log(LogLevels.VERBOSE, message)
  }

  log = (level: LogLevel, message: string | object | Error): void => {
    const timestamp = new Date().toISOString().slice(11, -2)
    const channel = this.channel ? `[${this.channel}] ` : " "
    let logLine = `|${timestamp}|${level.signal}|${channel}`

    if (message instanceof Error) {
      logLine += `${message.message} ${message?.stack ?? ""}`
    } else {
      logLine += format(message)
    }

    if (globalOptions.logFile) {
      // Write to the global log file
      fs.appendFileSync(globalOptions.logFile, logLine)
      fs.appendFileSync(globalOptions.logFile, "\n")
    }

    if (level.level >= globalOptions.consoleLevel.level) {
      // Write to the console for levels higher than the minimum required level
      console.log(tint(logLine, level.color))
    }
  }
}

function tint(text: string, color?: ChalkInstance): string {
  return color ? color(text) : text
}
