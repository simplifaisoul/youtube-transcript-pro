import { useState, useEffect } from 'react'
import { Moon, Sun, Youtube, Download, Copy, Languages, Play, Loader2 } from 'lucide-react'
import { extractVideoId, fetchTranscript, TranscriptSegment } from './utils/transcript'
import TranscriptViewer from './components/TranscriptViewer'
import VideoPlayer from './components/VideoPlayer'
import LanguageSelector from './components/LanguageSelector'
import SearchBar from './components/SearchBar'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true // Default to dark mode
  })
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractVideoId(videoUrl)
    
    if (!id) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setVideoId(id)
    setError(null)
    setLoading(true)
    setTranscript([])

    try {
      const data = await fetchTranscript(id, selectedLanguage)
      setTranscript(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcript')
      setVideoId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    const text = transcript.map(seg => seg.text).join(' ')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const text = transcript.map(seg => seg.text).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `youtube-transcript-${videoId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }

  const handleTranscriptClick = (start: number) => {
    setCurrentTime(start)
  }

  const filteredTranscript = searchQuery
    ? transcript.filter(seg => 
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-purple-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg shadow-purple-500/50">
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
                  Transcript Pro
                </h1>
                <p className="text-xs text-purple-400/70">Free YouTube Transcript Extractor</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-purple-900/30 hover:bg-purple-800/50 border border-purple-700/50 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-purple-400" /> : <Moon className="w-5 h-5 text-purple-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
            Extract YouTube Transcripts Instantly
          </h2>
          <p className="text-lg text-purple-300/80 mb-8">
            Get transcripts from any YouTube video with a beautiful, modern interface
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-800/50 bg-gray-900 text-purple-100 placeholder-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-base"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Get Transcript
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-red-400 text-sm text-left">{error}</p>
            )}
          </form>
        </div>

        {/* Main Content */}
        {videoId && (
          <div className="grid lg:grid-cols-2 gap-6 animate-slide-up">
            {/* Video Player */}
            <div className="space-y-4">
              <VideoPlayer
                videoId={videoId}
                currentTime={currentTime}
                onTimeUpdate={handleTimeUpdate}
              />
              
              {/* Controls */}
              <div className="bg-gray-900 rounded-xl p-4 shadow-lg shadow-purple-500/20 border border-purple-800/50">
                <div className="flex flex-wrap gap-2 mb-4">
                  <LanguageSelector
                    value={selectedLanguage}
                    onChange={(lang) => {
                      setSelectedLanguage(lang)
                      if (videoId) {
                        setLoading(true)
                        fetchTranscript(videoId, lang)
                          .then(setTranscript)
                          .catch(err => setError(err.message))
                          .finally(() => setLoading(false))
                      }
                    }}
                    onReload={() => {
                      if (videoId) {
                        setLoading(true)
                        fetchTranscript(videoId, selectedLanguage)
                          .then(setTranscript)
                          .catch(err => setError(err.message))
                          .finally(() => setLoading(false))
                      }
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  resultCount={filteredTranscript.length}
                  totalCount={transcript.length}
                />
              </div>
            </div>

            {/* Transcript Viewer */}
            <div className="bg-gray-900 rounded-xl shadow-lg shadow-purple-500/20 border border-purple-800/50 overflow-hidden">
              <div className="p-4 border-b border-purple-800/50 bg-gradient-to-r from-purple-900/30 to-purple-800/20">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-300">
                  <Languages className="w-5 h-5 text-purple-400" />
                  Transcript
                  {transcript.length > 0 && (
                    <span className="text-sm font-normal text-purple-400/70">
                      ({transcript.length} segments)
                    </span>
                  )}
                </h3>
              </div>
              <TranscriptViewer
                transcript={filteredTranscript}
                currentTime={currentTime}
                onSegmentClick={handleTranscriptClick}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        )}

        {/* Features Section */}
        {!videoId && (
          <div className="mt-16 grid md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg shadow-purple-500/20 border border-purple-800/50">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 border border-purple-700/50">
                <Youtube className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-purple-300">Instant Extraction</h3>
              <p className="text-purple-300/70 text-sm">
                Get transcripts from any YouTube video in seconds with our fast API
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg shadow-purple-500/20 border border-purple-800/50">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 border border-purple-700/50">
                <Languages className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-purple-300">Multiple Languages</h3>
              <p className="text-purple-300/70 text-sm">
                Support for multiple transcript languages and easy translation
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg shadow-purple-500/20 border border-purple-800/50">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mb-4 border border-purple-700/50">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-purple-300">Export Options</h3>
              <p className="text-purple-300/70 text-sm">
                Copy to clipboard or download as text file for easy sharing
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-purple-900/50 bg-black/50">
        <div className="container mx-auto px-4 text-center text-purple-400/70 text-sm">
          <p className="text-purple-300">Made by <span className="font-bold text-purple-400">SimplifAI-1</span></p>
          <p className="mt-2 text-purple-400/60">100% Free • No Sign Up Required • No Limits</p>
        </div>
      </footer>
    </div>
  )
}

export default App
