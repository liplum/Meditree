export const backend = {
  listUrl(baseUrl) { return `${baseUrl}/list` },
  fileUrl(baseUrl) { return `${baseUrl}/file` },
  reolsveFileUrl(baseUrl, path) {
    return encodeURI(`${this.fileUrl(baseUrl)}/${path}`);
  },
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