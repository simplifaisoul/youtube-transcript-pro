import { useRef, useEffect } from 'react'
import ReactPlayer from 'react-player/youtube'

interface VideoPlayerProps {
  videoId: string
  currentTime: number
  onTimeUpdate: (time: number) => void
}

export default function VideoPlayer({ videoId, currentTime, onTimeUpdate }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)
  const lastSeekTime = useRef<number>(0)

  useEffect(() => {
    if (playerRef.current && currentTime > 0 && Math.abs(currentTime - lastSeekTime.current) > 1) {
      const player = playerRef.current
      // ReactPlayer's seekTo method
      if (player && typeof (player as any).seekTo === 'function') {
        try {
          ;(player as any).seekTo(currentTime, 'seconds')
          lastSeekTime.current = currentTime
        } catch (error) {
          // Silently handle seek errors
        }
      }
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
        config={
          {
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
              },
            },
          } as any
        }
      />
    </div>
  )
}
