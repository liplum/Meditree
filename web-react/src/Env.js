export function updatePageTitle(title) {
  document.title = `${title} - Meditree`
}
export const backend = {
  listUrl(server, passcode) {
    if (passcode) {
      return `${server}/list?passcode=${passcode}`
    } else {
      return `${server}/list`
    }
  },
  reolsveFileUrl(server, path, passcode) {
    if (passcode) {
      return encodeURI(`${server}/file/${path}?passcode=${passcode}`)
    } else {
      return encodeURI(`${server}/file/${path}`)
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
  getAstrologyOf(server) {
    return JSON.parse(window.localStorage.getItem(`astrology-${server}`)) ?? {}
  },
  setAstrologyOf(server, value) {
    window.localStorage.setItem(`astrology-${server}`, JSON.stringify(value))
  },
  getLastSelectedFileOf(server) {
    return JSON.parse(window.localStorage.getItem(`lastSelectedFile-${server}`))
  },
  setLastSelectedFileOf(server, value) {
    window.localStorage.setItem(`lastSelectedFile-${server}`, JSON.stringify(value))
  },
  get lastConnected() {
    return JSON.parse(window.localStorage.getItem("lastConnected")) ?? null
  },
  set lastConnected(value) {
    window.localStorage.setItem("lastConnected", JSON.stringify(value))
  },
}
