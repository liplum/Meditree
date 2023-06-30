export class Timer {
  private startTime?: number
  private name2StartTime?: Record<string, number>
  start(name?: string): void {
    if (name) {
      this.name2StartTime = { [name]: Date.now() }
    } else {
      this.startTime = Date.now()
    }
  }

  stop(name?: string, log?: (time: string) => void): number {
    let startTime: number | undefined
    if (name) {
      startTime = this.name2StartTime?.[name]
    } else {
      startTime = this.startTime
    }
    let time: number
    if (startTime) {
      time = Date.now() - startTime
    } else {
      time = 0
    }
    if (name) {
      log?.(`${name}: ${time}ms`)
    } else {
      log?.(`${time}ms`)
    }
    return time
  }
}

export interface LoopTask {
  unref(): void
  stop(): void
  isRunning(): boolean
}

export function createLoopTask(callback: (duration: number) => void): LoopTask {
  let lastTime = new Date()

  let timer: NodeJS.Timer | null = setInterval(() => {
    const cur = new Date()
    const duration = cur.getTime() - lastTime.getTime()
    lastTime = cur
    callback(duration)
  })
  return {
    unref() {
      timer?.unref()
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    isRunning() {
      return timer !== null
    }
  }
}
