import { useRef, useEffect } from 'react'
import { TranscriptSegment } from '../utils/transcript'
import { Clock } from 'lucide-react'

interface TranscriptViewerProps {
  transcript: TranscriptSegment[]
  currentTime: number
  onSegmentClick: (start: number) => void
  searchQuery: string
}

export default function TranscriptViewer({
  transcript,
  currentTime,
  onSegmentClick,
  searchQuery,
}: TranscriptViewerProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentTime])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const highlightText = (text: string, query: string): JSX.Element => {
    if (!query) return <>{text}</>

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-purple-500 text-purple-100 px-1 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  if (transcript.length === 0) {
    return (
      <div className="p-8 text-center text-purple-400/60">
        <p>No transcript available. Try a different language or video.</p>
      </div>
    )
  }

  return (
    <div className="h-[600px] overflow-y-auto scrollbar-thin p-4">
      <div className="space-y-3">
        {transcript.map((segment, index) => {
          const isActive =
            currentTime >= segment.start &&
            currentTime < segment.start + segment.duration

          return (
            <div
              key={index}
              ref={isActive ? activeRef : null}
              onClick={() => onSegmentClick(segment.start)}
              className={`
                p-4 rounded-lg cursor-pointer transition-all
                ${
                  isActive
                    ? 'bg-purple-900/50 border-2 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-gray-800/50 border border-purple-800/30 hover:bg-purple-900/30 hover:border-purple-700/50'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <button
                  className={`
                    flex items-center gap-1 text-xs font-mono px-2 py-1 rounded
                    ${
                      isActive
                        ? 'bg-purple-700 text-purple-100 border border-purple-500'
                        : 'bg-purple-900/50 text-purple-300 border border-purple-800/50'
                    }
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSegmentClick(segment.start)
                  }}
                >
                  <Clock className="w-3 h-3" />
                  {formatTime(segment.start)}
                </button>
                <p
                  className={`
                    flex-1 text-sm leading-relaxed
                    ${
                      isActive
                        ? 'text-purple-100 font-medium'
                        : 'text-purple-200/80'
                    }
                  `}
                >
                  {highlightText(segment.text, searchQuery)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
