import React, { useContext, useEffect, useState } from "react"
import { Tree } from "antd"
import * as ft from "../models/FileTree"
import { FileTreeDelegateContext } from "../pages/View"
import { useTheme } from "@mui/material/styles"
import { useNavigate } from "react-router-dom"
import { NoFilesIndicator } from "../components/NoFilesIndicator"
const { DirectoryTree } = Tree

export function FileTreeNavigation({ selectedFile, searchDelegate }) {
  const [delegate] = useContext(FileTreeDelegateContext)
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
    return <NoFilesIndicator/>
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
