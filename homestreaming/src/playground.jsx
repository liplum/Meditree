import './playground.css'
import React, { useContext, useRef } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"
import { AstrologyContext, FileTreeDeleagteContext, ResponsiveAppBar, SelectedFileContext } from './app';
import { Tooltip, IconButton, Typography } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from './env';
import useForceUpdate from 'use-force-update';

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
  "audio/mpeg": renderAudio,
  "audio/ogg": renderAudio,
}

export function FileDisplayBoard(props) {
  const [delegate] = useContext(FileTreeDeleagteContext)
  const { isStarred, star, unstar } = useContext(AstrologyContext)
  const [file] = useContext(SelectedFileContext)
  const boardRef = useRef()
  const forceUpdate = useForceUpdate()
  const onMouseDown = (e) => {
    if (!isMobile) return
    const { clientX } = e
    const { left, width } = boardRef.current.getBoundingClientRect()

    if (clientX < left + width / 2) {
      // left side
      goPreviousFile(file)
    } else {
      // right side
      goNextFile(file)
    }
  }
  const onWheel = (e) => {
    if (isMobile) return
    if (e.deltaY > 0) {
      // wheel down
      goNextFile(file)
    } else if (e.deltaY < 0) {
      // wheel up
      goPreviousFile(file)
    }
  }
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      goPreviousFile(file)
    } else if (e.key === "ArrowRight") {
      goNextFile(file)
    }
  }
  let content
  if (file) {
    file.url = backend.reolsveFileUrl(file.path)
    const renderer = type2Render[file.type]
    content = <div
      ref={boardRef}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex="0"
      style={{
        width: "100%",
        height: "100%",
      }}>
      {
        renderer ?
          renderer(file) :
          <h1>Cannot display this file.</h1>
      }
    </div>
  } else {
    content = <h1>No file selected</h1>
  }
  return <>
    <ResponsiveAppBar>
      <Tooltip title={file?.path}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {file ? file.name : "No file selected"}
        </Typography>
      </Tooltip>
      <Tooltip title="Add To Star ">
        <IconButton onClick={() => {
          if (isStarred(file)) unstar(file)
          else star(file)
          forceUpdate()
        }}>
          {isStarred(file) ? <Star /> : <StarBorder />}
        </IconButton>
      </Tooltip>
    </ResponsiveAppBar>
    {content}
  </>
}

function renderVideo(file) {
  return <video controls
    src={file.url}
    autoPlay
    onMouseDown={(event) => {
      event.stopPropagation();
    }}
    className={"video-view"} />
}

function renderImage(file) {
  return <img
    src={file.url}
    alt={file.path}
    className={"img-view"} />
}

function renderAudio(file) {
  return <audio
    controls
    src={file.url}
    alt={file.path}
    className={"video-view"} />
}
