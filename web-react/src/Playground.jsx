import "./Playground.css"
import React, { useContext, useEffect, useRef, useState } from "react"
import { isMobile } from "react-device-detect"
import { AstrologyContext, FileNavigationContext, ResponsiveAppBar } from "./View"
import { Tooltip, IconButton, Typography, CircularProgress, Chip } from "@mui/material"
import { StarBorder, Star, FolderOff } from "@mui/icons-material"
import useForceUpdate from "use-force-update"
import { i18n } from "./I18n"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Failed } from "./Loading"
import { filesize } from "filesize"
import { VideoJS } from "./VideoPlayer"

const VideoRenderer = React.memo(VideoRendererImpl)

function resolveRenderer(type) {
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  if (type.startsWith("video")) {
    return VideoRenderer
  }
  if (type.startsWith("audio")) {
    return AudioRenderer
  }
  if (type.startsWith("text")) {
    if (type.includes("markdown")) {
      return MarkdownRenderer
    }
    return PlainTextRenderer
  }
  if (type === "application/x-mpegURL") {
    return VideoRenderer
  }
}

export function FileDisplayBoard({ file }) {
  const { isStarred, star, unstar } = useContext(AstrologyContext)
  const { goNextFile, goPreviousFile } = useContext(FileNavigationContext)
  const boardRef = useRef()
  const forceUpdate = useForceUpdate()
  let content = null
  if (!file) {
    content = <div className="no-file-label" >
      <FolderOff style={{ width: "8rem", height: "8rem" }} />
    </div>
  } else {
    const Renderer = resolveRenderer(file.type)
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
        Renderer
          ? <Renderer file={file} />
          : <h1>{i18n.playground.unsupportedFileType}</h1>
      }
    </div>
  }
  const isFileStarred = isStarred(file)
  return <>
    <ResponsiveAppBar>
      <Tooltip title={file?.path}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {file ? file.name : null}
        </Typography>
      </Tooltip>
      {file && // only display if any file is selected
        <>
          {file.size && // only display if file has size property
            <Chip label={filesize(file.size, { base: 2, standard: "jedec" })} />
          }
          <Tooltip title={
            isFileStarred
              ? i18n.playground.unstarBtn
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
    <ErrorBoundary fallback={<Failed text={i18n.playground.unsupportedFileType} />}>
      {content}
    </ErrorBoundary>
  </>
}
const isMobileSafari = /iP(ad|hone|od).+Version\/[\d.]+.*Safari/i.test(navigator.userAgent)
function VideoRendererImpl({ file }) {
  // for HLS support on mobile safari
  // ref: http://jsfiddle.net/fxfktztx/1, https://stackoverflow.com/a/47632587/13691173
  const overrideNative = !isMobileSafari
  const videoJsOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    liveui: true,
    html5: {
      vhs: {
        overrideNative
      }
    },
    nativeVideoTracks: !overrideNative,
    nativeAudioTracks: !overrideNative,
    nativeTextTracks: !overrideNative,
    playbackRates: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
    sources: [{
      src: file.url,
      type: file.type,
    }],
  }
  return <VideoJS
    options={videoJsOptions}
  />
}

function ImageRenderer({ file }) {
  return <img
    src={file.url}
    alt={file.path}
    className={"img-view"} />
}

function AudioRenderer({ file }) {
  return <audio
    controls
    src={file.url}
    alt={file.path}
    onMouseDown={(event) => {
      event.stopPropagation()
    }}
    className={"video-view"} />
}

function MarkdownRenderer({ file }) {
  const pathParts = file.path.split("/")
  pathParts.pop()
  return <Markdown
    src={file.url}
    alt={file.path}
    parentDir={pathParts.join("/")}
  />
}
function Markdown({ src, alt, parentDir }) {
  const [markdown, setMarkdown] = useState()

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
            return `file/${encodeURIComponent(`${parentDir}/${uri}`)}`
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  }
}

function PlainTextRenderer(file) {
  const [text, setText] = useState()

  useEffect(() => {
    fetch(file.url)
      .then(response => response.text())
      .then(text => setText(text))
      .catch(() => setText(null))
  }, [file.url])

  if (!text) {
    return <CircularProgress />
  } else {
    return <Typography variant="p" component="div"
      style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        height: "90%",
        overflow: "auto"
      }}>
      {text ?? file.path}
    </Typography>
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error, _info) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback
    }

    return this.props.children
  }
}
