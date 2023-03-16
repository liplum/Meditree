import './playground.css'
import React, { createRef } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
  "audio/mpeg": renderAudio,
  "audio/ogg": renderAudio,
}

export class FileDisplayBoard extends React.Component {
  constructor(props) {
    super(props);
    this.boardRef = createRef()
  }

  handleMouseDown = (event) => {
    if (!isMobile) return
    const { clientX } = event;
    const { left, width } = this.boardRef.current.getBoundingClientRect();

    if (clientX < left + width / 2) {
      // left side
      goPreviousFile(this.props.file)
    } else {
      // right side
      goNextFile(this.props.file)
    }
  }

  render() {
    const file = this.props.file
    if (!file) {
      return <h1>No file selected</h1>
    }
    const renderer = type2Render[file.type]

    const content = renderer ?
      renderer(file) :
      <h1>Cannot display this file.</h1>
    return <div
      ref={this.boardRef}
      onMouseDown={this.handleMouseDown}
      style={{
        width: "100%",
        height: "100%",
      }}
    >{content}</div>
  }
}

function renderVideo(file) {
  return <VideoPlayer
    url={file.url}
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

function VideoPlayer() {
  return <video controls
    src={this.props.url} {...this.props}
  />
}