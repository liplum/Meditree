import React, { useContext, useEffect, useState } from "react"
import { Tree } from "antd"
import * as ft from "./FileTree"
import { FileTreeDeleagteContext } from "./View"
import { useTheme } from "@mui/material/styles"
import { FolderOff } from "@mui/icons-material"
import { useNavigate } from "react-router"
const { DirectoryTree } = Tree

export function FileTreeNavigation({ selectedFile, searchDelegate }) {
  const [delegate] = useContext(FileTreeDeleagteContext)
  const [renderTree, setRenderTree] = useState()
  const navigate = useNavigate()
  useEffect(() => {
    if (!delegate) return
    if (searchDelegate) {
      const newRenderTree = ft.filter(delegate.renderTree, searchDelegate)
      setRenderTree(newRenderTree)
    }
  }, [searchDelegate, delegate])

  const theme = useTheme()
  if (!renderTree) return
  if (renderTree.children.length <= 0) {
    return <div className="no-file-label" >
      <FolderOff style={{ width: "8rem", height: "8rem" }} />
    </div>
  }
  return (
    <DirectoryTree
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        fontSize: "1.2rem",
      }}
      showLine={true}
      showIcon={true}
      treeData={renderTree.children}
      defaultSelectedKeys={[selectedFile?.nodeId]}
      defaultExpandedKeys={selectedFile?.tracking}
      onSelect={(_keys, info) => {
        if (info.node.isLeaf) {
          const selected = info.node
          navigate(`/view?file=${encodeURIComponent(selected.path)}`)
        }
      }}
    />
  )
}
