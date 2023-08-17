import * as React from "react"
import "./NoFilesIndicator.css"
import { Empty } from "antd"

export function NoFilesIndicator() {
  return (
    <div className="no-files">
      <Empty description={false} />
    </div>
  )
}
