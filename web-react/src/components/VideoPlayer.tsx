// import for side effects
import videojs from "video.js"
import "video.js/dist/video-js.css"
import { useEffect, useRef } from "react"
import "@videojs/http-streaming"
import Player from "video.js/dist/types/player"

export function VideoJS({ options, onReady }: {
  options: object & { autoplay: boolean, sources: unknown[] }
  onReady?: (player: Player) => void
}) {
  const videoRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<Player | null>(null)

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode. 
      const videoElement = document.createElement("video-js")

      videoElement.classList.add("vjs-big-play-centered")
      videoRef.current?.appendChild(videoElement)

      const player = playerRef.current = videojs(videoElement, options, () => {
        onReady && onReady(player)
      })
      // You could update an existing player in the `else` block here
      // on prop change, for example:
    } else {
      const player = playerRef.current

      player.autoplay(options.autoplay)
      player.src(options.sources)
    }
  }, [onReady, options, videoRef])

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [playerRef])

  return (
    <div data-vjs-player
      onMouseDown={(event) => {
        event.stopPropagation()
      }}>
      <div ref={videoRef} />
    </div>
  )
}
