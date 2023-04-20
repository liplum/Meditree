import { removePrefix } from "./Utils"

export function updatePageTitle(title) {
  document.title = `${title} - Meditree`
}
export const backend = {
  loginUrl: "/login",
  reolsveFileUrl(path) {
    if (path.startsWith("/")) {
      path = removePrefix(path, "/")
    }
    return encodeURI(`/file/${path}`)
  },
}

export const storage = {
  getAstrology() {
    return JSON.parse(window.localStorage.getItem("astrology")) ?? {}
  },
  setAstrology(value) {
    window.localStorage.setItem("astrology", JSON.stringify(value))
  },
  getLastSelectedFile() {
    return JSON.parse(window.localStorage.getItem("lastSelectedFile"))
  },
  setLastSelectedFile(value) {
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(value))
  },
  get lastConnected() {
    return JSON.parse(window.localStorage.getItem("lastConnected")) ?? null
  },
  set lastConnected(value) {
    window.localStorage.setItem("lastConnected", JSON.stringify(value))
  },
}
