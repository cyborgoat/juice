type LogLevel = "debug" | "info" | "warn" | "error"

function consoleMethod(level: LogLevel) {
  switch (level) {
    case "debug":
      return console.debug
    case "info":
      return console.info
    case "warn":
      return console.warn
    case "error":
      return console.error
  }
}

export function createLogger(scope: string) {
  return {
    debug(message: string, details?: unknown) {
      const log = consoleMethod("debug")
      if (details === undefined) {
        log(`[juice][${scope}] ${message}`)
        return
      }

      log(`[juice][${scope}] ${message}`, details)
    },
    info(message: string, details?: unknown) {
      const log = consoleMethod("info")
      if (details === undefined) {
        log(`[juice][${scope}] ${message}`)
        return
      }

      log(`[juice][${scope}] ${message}`, details)
    },
    warn(message: string, details?: unknown) {
      const log = consoleMethod("warn")
      if (details === undefined) {
        log(`[juice][${scope}] ${message}`)
        return
      }

      log(`[juice][${scope}] ${message}`, details)
    },
    error(message: string, details?: unknown) {
      const log = consoleMethod("error")
      if (details === undefined) {
        log(`[juice][${scope}] ${message}`)
        return
      }

      log(`[juice][${scope}] ${message}`, details)
    },
  }
}
