import { useRef, useEffect } from 'react'
import ReactPlayer from 'react-player/youtube'

interface VideoPlayerProps {
  videoId: string
  currentTime: number
  onTimeUpdate: (time: number) => void
}

export default function VideoPlayer({ videoId, currentTime, onTimeUpdate }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)

  useEffect(() => {
    if (playerRef.current && currentTime > 0) {
      playerRef.current.seekTo(currentTime, 'seconds')
    }
  }, [currentTime])

  return (
    <div className="bg-black rounded-xl overflow-hidden shadow-2xl aspect-video">
      <ReactPlayer
        ref={playerRef}
        url={`https://www.youtube.com/watch?v=${videoId}`}
        width="100%"
        height="100%"
        controls
        playing={false}
        onProgress={(state) => {
          onTimeUpdate(state.playedSeconds)
        }}
        config={{
          youtube: {
            playerVars: {
              modestbranding: 1,
              rel: 0,
            },
          },
        }}
      />
    </div>
  )
}
