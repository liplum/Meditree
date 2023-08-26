export function updatePageTitle(title: string) {
  document.title = `${title} - Meditree`
}

export const storage = {
  get lastFilePathFromUrl(): string | null {
    return window.localStorage.getItem("last-file-path-from-url")
  },
  set lastFilePathFromUrl(value: string | null) {
    if (value) window.localStorage.setItem("last-file-path-from-url", value)
    else window.localStorage.removeItem("last-file-path-from-url")
  },
}
