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
  getLastSelectedFile() {
    return JSON.parse(window.localStorage.getItem("lastSelectedFile"))
  },
  setLastSelectedFile(value) {
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(value))
  },
}
