import './playground.css'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"
import { AstrologyContext, BackendContext, ResponsiveAppBar, SelectedFileContext } from './dashboard';
import { Tooltip, IconButton, Typography, CircularProgress, Chip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from './env';
import useForceUpdate from 'use-force-update';
import { i18n } from './i18n';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Failed } from './loading';
import { filesize } from "filesize";

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
  "image/svg+xml": renderImage,
  "image/gif": renderImage,
  "image/webp": renderImage,
  "audio/mpeg": renderAudio,
  "audio/ogg": renderAudio,
  "text/markdown": renderMarkdown,
  "text/plain": renderPlainText,
}

export function FileDisplayBoard(props) {
  const { isStarred, star, unstar } = useContext(AstrologyContext)
  const { baseUrl, passcode } = useContext(BackendContext)
  const [file] = useContext(SelectedFileContext)
  const boardRef = useRef()
  const forceUpdate = useForceUpdate()
  let content = null
  if (file) {
    if (!file.url) {
      file.url = backend.reolsveFileUrl(baseUrl, file.path, passcode)
    }
    const renderer = type2Render[file.type]
    // wheel control works so bad when using trackpad.
    content = <div
      ref={boardRef}
      onMouseDown={(e) => {
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
      }}
      onKeyUp={(e) => {
        if (e.key === "ArrowLeft") {
          goPreviousFile(file)
          e.preventDefault()
        } else if (e.key === "ArrowRight") {
          goNextFile(file)
          e.preventDefault()
        }
      }}
      tabIndex="0"
      className="board">
      {
        renderer ?
          renderer(file) :
          <h1>Cannot display this file.</h1>
      }
    </div>
  }
  const isFileStarred = isStarred(file)
  return <>
    <ResponsiveAppBar>
      <Tooltip title={file?.path}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {file ? file.name : "No file selected"}
        </Typography>
      </Tooltip>
      {file && // only display if any file is selected
        <>
          <Chip label={filesize(file.size, { base: 2, standard: "jedec" })} />
          <Tooltip title={
            isFileStarred ? i18n.playground.unstarBtn
              : i18n.playground.starBtn
          }>
            <IconButton onClick={() => {
              if (isFileStarred) unstar(file)
              else star(file)
              forceUpdate()
            }}>
              {isFileStarred ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </>
      }
    </ResponsiveAppBar>
    <ErrorBoundary fallback={<Failed text={i18n.playground.failedToDisplay} />}>
      {content}
    </ErrorBoundary>
  </>
}

function renderVideo(file) {
  return <video controls
    src={file.url}
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
    onMouseDown={(event) => {
      event.stopPropagation();
    }}
    className={"video-view"} />
}

function MarkdownFromURL({ src, alt, parentDir }) {
  const [markdown, setMarkdown] = useState()
  const { baseUrl, passcode } = useContext(BackendContext)

  useEffect(() => {
    fetch(src)
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(() => setMarkdown(alt))
  }, [src])
  if (!markdown) {
    return <CircularProgress />
  } else {
    // TODO: Better scrolling
    return <div style={{ height: "90%", overflow: "auto" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        transformImageUri={uri => {
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return uri
          } else {
            return backend.reolsveFileUrl(baseUrl, `${parentDir}/${uri}`, passcode)
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  }
}

function renderMarkdown(file) {
  const pathParts = file.path.split("/")
  pathParts.pop()
  return <MarkdownFromURL
    src={file.url}
    alt={file.path}
    parentDir={pathParts.join("/")}
  />
}
function PlainText({ src, alt }) {
  const [text, setText] = useState()

  useEffect(() => {
    fetch(src)
      .then(response => response.text())
      .then(text => setText(text))
      .catch(() => setText(alt))
  }, [src])

  if (!text) {
    return <CircularProgress />
  } else {
    return <Typography variant="p" component="div"
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        height: "90%", overflow: "auto"
      }}>
      {text}
    </Typography>
  }
}

function renderPlainText(file) {
  return <PlainText
    src={file.url}
    alt={file.path} />
}
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
}