export function updatePageTitle(title: string) {
  document.title = `${title} - Meditree`
}

export type Astrology = Record<string, any>

export const storage = {
  getAstrology(): Astrology {
    const astrology = window.localStorage.getItem("astrology")
    if (astrology) return JSON.parse(astrology) ?? {}
    else return {}
  },
  setAstrology(value: Astrology) {
    window.localStorage.setItem("astrology", JSON.stringify(value))
  },
  get lastFilePathFromUrl(): string | null {
    return window.localStorage.getItem("lastFilePathFromUrl")
  },
  set lastFilePathFromUrl(value: string | null) {
    if (value) window.localStorage.setItem("lastFilePathFromUrl", value)
    else window.localStorage.removeItem("lastFilePathFromUrl")
  },
}
