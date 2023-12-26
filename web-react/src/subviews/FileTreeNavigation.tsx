import { useEffect, useState } from "react"
import { Tree } from "antd"
import { filterDirectory, DirectoryNode, FileNode, FileTreeDelegate } from "../models/FileTree"
import { useTheme } from "@mui/material/styles"
import { useNavigate } from "react-router-dom"
import { NoFilesIndicator } from "../components/NoFilesIndicator"
const { DirectoryTree } = Tree

export function FileTreeNavigation({ selectedFile, searchDelegate, delegate }: {
  selectedFile?: FileNode
  searchDelegate: (file: FileNode) => boolean
  delegate: FileTreeDelegate
}) {
  const [renderTree, setRenderTree] = useState<DirectoryNode>()
  const navigate = useNavigate()
  useEffect(() => {
    if (!delegate) return
    if (searchDelegate) {
      const newRenderTree = filterDirectory(delegate.renderTree, searchDelegate)
      setRenderTree(newRenderTree)
    }
  }, [searchDelegate, delegate])

  const theme = useTheme()
  if (!renderTree) return null
  if (renderTree.children.length <= 0) {
    return <NoFilesIndicator />
  }
  return <DirectoryTree
    style={{
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      fontSize: "1.2rem",
    }}
    showLine={true}
    showIcon={true}
    treeData={renderTree.children}
    defaultSelectedKeys={selectedFile ? [selectedFile.key] : []}
    defaultExpandedKeys={selectedFile?.tracking}
    onSelect={(_keys, info) => {
      if (info.node.isLeaf) {
        const newlySelected = info.node
        navigate(`/view?file=${encodeURIComponent(newlySelected.path)}`)
      }
    }}
  />
}
