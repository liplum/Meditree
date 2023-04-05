import mitt from 'mitt'

export const backend = {
  listUrl(baseUrl, passcode) {
    if (passcode) {
      return `${baseUrl}/list?passcode=${passcode}`
    } else {
      return `${baseUrl}/list`
    }
  },
  reolsveFileUrl(baseUrl, path, passcode) {
    if (passcode) {
      return encodeURI(`${baseUrl}/file/${path}?passcode=${passcode}`)
    } else {
      return encodeURI(`${baseUrl}/file/${path}`)
    }
  },
  suffixWithPasscode(url, passcode) {
    const passcodeSuffix = `?passcode=${encodeURI(passcode)}`
    if (passcode && !url.endsWith(passcodeSuffix)) {
      return `${url}${passcodeSuffix}`
    } else {
      return url
    }
  }
}

export const storage = {
  getAstrologyOf(baseUrl) {
    return JSON.parse(window.localStorage.getItem(`astrology-${baseUrl}`)) ?? {}
  },
  setAstrologyOf(baseUrl, value) {
    window.localStorage.setItem(`astrology-${baseUrl}`, JSON.stringify(value))
  },
  getLastSelectedFileOf(baseUrl) {
    return JSON.parse(window.localStorage.getItem(`lastSelectedFile-${baseUrl}`))
  },
  setLastSelectedFileOf(baseUrl, value) {
    window.localStorage.setItem(`lastSelectedFile-${baseUrl}`, JSON.stringify(value))
  },
  get lastConnected() {
    return JSON.parse(window.localStorage.getItem("lastConnected")) ?? null
  },
  set lastConnected(value) {
    window.localStorage.setItem("lastConnected", JSON.stringify(value))
  },
}

export const emitter = mitt()

export function goNextFile(file) {
  emitter.emit("go-next", file)
}

export function goPreviousFile(file) {
  emitter.emit("go-previous", file)
}

export function onGoNextFile(...args) {
  emitter.on("go-next", ...args)
}

export function onPreviousFile(...args) {
  emitter.on("go-previous", ...args)
}

export function offGoNextFile(...args) {
  emitter.off("go-next", ...args)
}

export function offPreviousFile(...args) {
  emitter.off("go-previous", ...args)
}