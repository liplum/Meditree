export function updatePageTitle(title) {
  document.title = `${title} - Meditree`
}

export const storage = {
  getAstrology() {
    return JSON.parse(window.localStorage.getItem("astrology")) ?? {}
  },
  setAstrology(value) {
    window.localStorage.setItem("astrology", JSON.stringify(value))
  },
  get lastFilePathFromUrl() {
    return window.localStorage.getItem("lastFilePathFromUrl")
  },
  set lastFilePathFromUrl(value) {
    window.localStorage.setItem("lastFilePathFromUrl", value)
  },
}
