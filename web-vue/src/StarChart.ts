import { FileInfo } from "./FileTree";

export class StarChart {
  private path2Star: Record<string, number | boolean> = {}
  star(file: FileInfo): void {
    if (this.path2Star[file.path]) return
    this.path2Star[file.path] = 1
    this.save()
  }
  unstar(file: FileInfo): void {
    if (!this.path2Star[file.path]) return
    delete this.path2Star[file.path]
    this.save()
  }
  isStarred(file: FileInfo): boolean {
    return Boolean(this.path2Star[file.path])
  }
  save(): void {
    window.localStorage.setItem("star-chart", JSON.stringify(this.path2Star))
  }
  load(): void {
    const json = window.localStorage.getItem("star-chart")
    this.path2Star = json ? JSON.parse(json) ?? {} : {}
  }
}