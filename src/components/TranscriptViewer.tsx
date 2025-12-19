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
              className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded"
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
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
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
                    ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400 shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <button
                  className={`
                    flex items-center gap-1 text-xs font-mono px-2 py-1 rounded
                    ${
                      isActive
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
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
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
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
