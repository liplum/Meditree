import * as React from "react"
import { FolderOff } from "@mui/icons-material"
import "./NoFilesIndicator.css"

export function NoFilesIndicator() {
  return (
    <div className="no-files">
      <FolderOff style={{ width: "8rem", height: "8rem" }} />
    </div>
  )
}
