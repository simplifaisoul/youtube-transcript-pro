export interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export async function fetchTranscript(
  videoId: string,
  language: string = 'en'
): Promise<TranscriptSegment[]> {
  try {
    // Try YouTube's internal API first (most reliable)
    const youtubeApiUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}`
    try {
      const response = await fetch(youtubeApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
        },
      })
      
      if (response.ok) {
        const xml = await response.text()
        const segments = parseXMLTranscript(xml)
        if (segments.length > 0) {
          return segments
        }
      }
    } catch (err) {
      console.warn('YouTube API failed, trying alternatives:', err)
    }

    // Try multiple free APIs as fallback
    const apis = [
      `https://tubetext.vercel.app/api/transcript?videoId=${videoId}&lang=${language}`,
      `https://youtubetranscripts.app/api?videoId=${videoId}&lang=${language}`,
      `https://getvideotranscript.com/api?videoId=${videoId}&lang=${language}`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`, // Try English as fallback
    ]

    for (const apiUrl of apis) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': apiUrl.includes('timedtext') ? 'application/xml' : 'application/json',
          },
        })

        if (!response.ok) {
          continue
        }

        // Handle XML response
        if (apiUrl.includes('timedtext') || response.headers.get('content-type')?.includes('xml')) {
          const xml = await response.text()
          const segments = parseXMLTranscript(xml)
          if (segments.length > 0) {
            return segments
          }
          continue
        }

        // Handle JSON response
        const data = await response.json()

        // Handle different API response formats
        if (Array.isArray(data)) {
          const segments = data.map((item: any) => ({
            text: item.text || item.transcript || item.caption || '',
            start: item.start || item.startTime || item.offset || 0,
            duration: item.duration || item.dur || 0,
          })).filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        if (data.transcript || data.segments || data.captions) {
          const segments = (data.transcript || data.segments || data.captions).map((item: any) => ({
            text: item.text || item.transcript || item.caption || '',
            start: item.start || item.startTime || item.offset || 0,
            duration: item.duration || item.dur || 0,
          })).filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        if (data.text && data.text.trim().length > 0) {
          // Single text response - split by sentences
          const sentences = data.text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0)
          return sentences.map((text: string, index: number) => ({
            text: text.trim(),
            start: index * 5, // Approximate 5 seconds per sentence
            duration: 5,
          }))
        }
      } catch (err) {
        console.warn(`API ${apiUrl} failed:`, err)
        continue
      }
    }

    throw new Error('No transcript available for this video. The video may not have captions enabled.')
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to fetch transcript. Please check the video URL and try again.'
    )
  }
}

function parseXMLTranscript(xml: string): TranscriptSegment[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const texts = doc.querySelectorAll('text')

  return Array.from(texts).map((text) => {
    const start = parseFloat(text.getAttribute('start') || '0')
    const duration = parseFloat(text.getAttribute('dur') || '0')
    const content = text.textContent || ''

    return {
      text: content.trim(),
      start,
      duration,
    }
  })
}
