import "./Playground.css"
import React, { useEffect, useState } from "react"
import { Typography, CircularProgress } from "@mui/material"
import { NoFilesIndicator } from "../components/NoFilesIndicator"
import { i18n } from "../I18n"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Failed } from "../components/Loading"
import { VideoJS } from "../components/VideoPlayer"
import { FileNode } from "../models/FileTree"
import { ErrorBoundary } from "react-error-boundary"

const VideoRenderer = React.memo(VideoRendererImpl)

function resolveRenderer(type: string) {
  if (typeof type !== "string") return
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

export function FileDisplayBoard({ file }: { file?: FileNode }) {
  let content = null
  if (!file) {
    content = <NoFilesIndicator />
  } else {
    const Renderer = resolveRenderer(file.type)
    // wheel control works so bad when using trackpad.
    content = <div
      tabIndex={0}
      className="board"
    >
      {
        Renderer
          ? <Renderer file={file} />
          : <h1>{i18n.playground.unsupportedFileType}</h1>
      }
    </div>
  }
  return <>
    <ErrorBoundary fallback={<Failed text={i18n.playground.unsupportedFileType} />}>
      {content}
    </ErrorBoundary>
  </>
}

const isMobileSafari = /iP(ad|hone|od).+Version\/[\d.]+.*Safari/i.test(navigator.userAgent)
function VideoRendererImpl({ file }: { file: FileNode }) {
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

function ImageRenderer({ file }: { file: FileNode }) {
  return <img
    src={file.url}
    alt={file.path}
    className={"img-view"} />
}

function AudioRenderer({ file }: { file: FileNode }) {
  return <audio
    controls
    src={file.url}
    onMouseDown={(event) => {
      event.stopPropagation()
    }}
    className={"video-view"} />
}

function MarkdownRenderer({ file }: { file: FileNode }) {
  const pathParts = file.path.split("/")
  pathParts.pop()
  return <Markdown
    src={file.url}
    alt={file.path}
    parentDir={pathParts.join("/")}
  />
}
function Markdown({ src, alt, parentDir }: { src: string, alt: string, parentDir: string }) {
  const [markdown, setMarkdown] = useState<string>()

  useEffect(() => {
    fetch(src)
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(() => setMarkdown(alt))
  }, [alt, src])
  if (!markdown) {
    return <CircularProgress />
  } else {
    // TODO: Better scrolling
    return <div style={{ height: "90%", overflow: "auto" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={uri => {
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

function PlainTextRenderer({ file }: { file: FileNode }) {
  const [text, setText] = useState<string>("")

  useEffect(() => {
    fetch(file.url)
      .then(response => response.text())
      .then(text => setText(text))
      .catch(() => setText(""))
  }, [file.url])

  if (!text) {
    return <CircularProgress />
  } else {
    return <Typography component="div"
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
