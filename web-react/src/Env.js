export function updatePageTitle(title) {
  document.title = `${title} - Meditree`
}

export const storage = {
  get lastFilePathFromUrl() {
    return window.localStorage.getItem("last-file-path-from-url")
  },
  set lastFilePathFromUrl(value) {
    if (value) window.localStorage.setItem("last-file-path-from-url", value)
    else window.localStorage.removeItem("last-file-path-from-url")
  },
}
