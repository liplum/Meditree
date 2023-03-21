import log4js from "log4js"

export function createLogger(category?: string): log4js.Logger {
  const logger = log4js.getLogger(category)
  logger.level = "trace"
  return logger
}
export type Logger = log4js.Logger
