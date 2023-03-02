import { VideoPlayer } from "./Video"
import './Playground.css'
import { isMobile } from 'react-device-detect'

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
}

export function FileDisplayBoard(props) {
  const file = props.file
  if (!file) {
    return <h1>No file selected</h1>
  }
  const renderer = type2Render[file.type]
  if (renderer) {
    return renderer(file)
  } else {
    return <h1>Cannot display this file.</h1>
  }
}

function renderVideo(file) {
  return <div className="video-container">
    <VideoPlayer url={file.url} 
    className={"video-view"} />
  </div>

}

function renderImage(file) {
  return <div className="img-container">
    <img
      src={file.url}
      alt={file.path}
      className={"img-view"} />
  </div>
}