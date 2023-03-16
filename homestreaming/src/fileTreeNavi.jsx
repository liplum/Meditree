import React, { useContext, useEffect, useState } from 'react'
import { Tree } from 'antd'
import * as ft from "./fileTree"
import {
  useNavigate,
} from "react-router-dom";
import { FileTreeDeleagteContext } from './app';
const { DirectoryTree } = Tree;

export function FileTreeNavigation(props) {
  const [delegate] = useContext(FileTreeDeleagteContext)
  const [renderTree, setRenderTree] = useState()
  const navigate = useNavigate()
  useEffect(() => {
    if (!delegate) return
    if (props.searchDelegate) {
      const newRenderTree = ft.filter(delegate.renderTree, props.searchDelegate,
        (id) => delegate.key2File.get(id)
      )
      setRenderTree(newRenderTree)
    }
  }, [props.searchDelegate, delegate])

  if (!renderTree) return
  return (
    <DirectoryTree
      style={{
        backgroundColor: "#0A0A0A",
        color: "#FAFAFA",
        fontSize: "14pt",
        height: "95vh",
        overflow: "auto",
      }}
      showLine={true}
      showIcon={false}
      treeData={renderTree.children}
      defaultSelectedKeys={[props.lastSelectedFile?.nodeId]}
      defaultExpandedKeys={props.lastSelectedFile?.tracking}
      onSelect={(keys, _) => {
        if (keys.length > 0) {
          let key = keys[0]
          if (typeof key === "string") {
            key = parseInt(key)
            if (isNaN(key)) return
          }
          const file = delegate.key2File.get(key)
          if (file) {
            navigate(`/${key}`)
          }
        }
      }}
    />
  );
}
