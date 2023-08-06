import React from "react"
import "./Loading.css"
import { i18n } from "../I18n"

export function Loading(props) {
  const circleSize = props.size || 100 // default size is 100px
  const circleColor = props.color || "#FAFAFA" // default color is black
  const textSize = props.textSize || circleSize / 4 // text size is a quarter of the circle size
  return (
    <div className="loading-container">
      <svg className="loading-svg" viewBox={`0 0 ${circleSize} ${circleSize}`} xmlns="http://www.w3.org/2000/svg">
        <circle className="loading-circle" cx={circleSize / 2} cy={circleSize / 2} r={circleSize / 2 - 5} stroke={circleColor} strokeWidth="10" fill="none" strokeLinecap="round" />
      </svg>
      <div className="loading-text" style={{ fontSize: textSize, color: circleColor }}>
        {i18n.loading.text}
      </div>
    </div>
  )
}

export function Failed(props) {
  const circleSize = props.size || 100
  const circleColor = props.color || "#FA0000" // default color is red
  const textSize = props.textSize || circleSize / 4
  return (
    <div className="loading-container">
      <svg className="error-svg" viewBox={`0 0 ${circleSize} ${circleSize}`} xmlns="http://www.w3.org/2000/svg">
        <line className="loading-line" x1={circleSize / 4} y1={circleSize / 4} x2={circleSize - circleSize / 4} y2={circleSize - circleSize / 4} stroke={circleColor} strokeWidth="10" strokeLinecap="round" />
        <line className="loading-line" x1={circleSize / 4} y1={circleSize - circleSize / 4} x2={circleSize - circleSize / 4} y2={circleSize / 4} stroke={circleColor} strokeWidth="10" strokeLinecap="round" />
      </svg>
      <div className="loading-text" style={{ fontSize: textSize, color: circleColor }}>{props.text}</div>
      {props.children}
    </div>
  )
};
