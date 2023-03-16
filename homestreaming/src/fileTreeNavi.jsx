import React, { useContext, useEffect, useState } from 'react'
import { emitter } from "./event"
import { Tree } from 'antd'
import * as ft from "./FileTree"
import {
  useNavigate,
} from "react-router-dom";
import { FileTreeDeleagteContext } from './App';
const { DirectoryTree } = Tree;


export function FileTreeNavigation(props) {
  const [delegate, setDelegate] = useContext(FileTreeDeleagteContext)
  const [renderTree, setRenderTree] = useState()

  function goFile(curFile, delta) {
    if (!(curFile && "key" in curFile)) return
    let nextKey = curFile.key + delta
    while (0 <= nextKey && nextKey < delegate.maxId) {
      const next = delegate.id2File.get(nextKey)
      if (!next) {
        nextKey += delta
      } else {
        props.onSelectFile?.({
          ...next,
          nextKey,
        })
        return
      }
    }
  }

  const goNext = (curFile) => goFile(curFile, +1)
  const goPrevious = (curFile) => goFile(curFile, -1)

  useEffect(() => {
    emitter.on("go-next", goNext)
    emitter.on("go-previous", goPrevious)
    return function cleanup() {
      emitter.on("go-next", goNext)
      emitter.on("go-previous", goPrevious)
    }
  })

  useEffect(() => {
    if (props.searchDelegate) {
      const newRenderTree = ft.filter(delegate.renderTree, props.searchDelegate,
        (id) => delegate.id2File.get(id)
      )
      setRenderTree(newRenderTree)
    }
  }, [props.searchDelegate, delegate.id2File, delegate.renderTree])

  if (!delegate) return
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
          this.setState({
            selected: key
          })
          if (typeof key === "string") {
            key = parseInt(key)
            if (isNaN(key)) return
          }
          const file = delegate.id2File.get(key)
          if (file) props.onSelectFile?.({
            key,
            ...file,
          })
        }
      }}
    />
  );
}
