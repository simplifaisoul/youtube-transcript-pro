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
  // Try multiple APIs with better error handling
  const apis = [
    // CORS-enabled APIs (try first)
    {
      url: `https://youtubetranscripts.app/api?videoId=${videoId}&lang=${language}`,
      type: 'json',
      cors: true,
    },
    {
      url: `https://tubetext.vercel.app/api/transcript?videoId=${videoId}&lang=${language}`,
      type: 'json',
      cors: true,
    },
    {
      url: `https://getvideotranscript.com/api?videoId=${videoId}&lang=${language}`,
      type: 'json',
      cors: true,
    },
    // YouTube API with CORS proxy
    {
      url: `https://cors-anywhere.herokuapp.com/https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}`,
      type: 'xml',
      cors: false,
    },
    // Direct YouTube API (may fail due to CORS, but worth trying)
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}`,
      type: 'xml',
      cors: false,
    },
    // Try English as fallback
    {
      url: `https://youtubetranscripts.app/api?videoId=${videoId}&lang=en`,
      type: 'json',
      cors: true,
    },
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      type: 'xml',
      cors: false,
    },
  ]

  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': api.type === 'xml' ? 'application/xml, text/xml' : 'application/json',
        },
        mode: 'cors',
      })

      if (!response.ok) {
        continue
      }

      // Handle XML response
      if (api.type === 'xml' || response.headers.get('content-type')?.includes('xml')) {
        const xml = await response.text()
        // Check if it's valid XML (not an error page)
        if (xml.includes('<transcript>') || xml.includes('<text')) {
          const segments = parseXMLTranscript(xml)
          if (segments.length > 0) {
            return segments
          }
        }
        continue
      }

      // Handle JSON response
      try {
        const data = await response.json()

        // Handle different API response formats
        if (Array.isArray(data)) {
          const segments = data
            .map((item: any) => ({
              text: item.text || item.transcript || item.caption || item.content || '',
              start: item.start || item.startTime || item.offset || item.timestamp || 0,
              duration: item.duration || item.dur || 3,
            }))
            .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        if (data.transcript || data.segments || data.captions || data.items) {
          const segmentsArray = data.transcript || data.segments || data.captions || data.items
          const segments = segmentsArray
            .map((item: any) => ({
              text: item.text || item.transcript || item.caption || item.content || '',
              start: item.start || item.startTime || item.offset || item.timestamp || 0,
              duration: item.duration || item.dur || 3,
            }))
            .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        if (data.text && data.text.trim().length > 0) {
          // Single text response - split by sentences or newlines
          const parts = data.text.split(/\n+/).filter((s: string) => s.trim().length > 0)
          if (parts.length > 0) {
            return parts.map((text: string, index: number) => ({
              text: text.trim(),
              start: index * 3,
              duration: 3,
            }))
          }
        }
      } catch (jsonErr) {
        // If JSON parsing fails, might be XML
        if (api.type === 'json') {
          const text = await response.text()
          if (text.includes('<transcript>') || text.includes('<text')) {
            const segments = parseXMLTranscript(text)
            if (segments.length > 0) {
              return segments
            }
          }
        }
        continue
      }
    } catch (err) {
      // Silently continue to next API
      continue
    }
  }

  // Last resort: Try to get transcript list and use first available
  try {
    const listUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`
    const listResponse = await fetch(listUrl, { mode: 'no-cors' })
    // This might not work due to CORS, but worth trying
  } catch (err) {
    // Ignore
  }

  throw new Error('Unable to fetch transcript. The video may not have captions, or all transcript services are unavailable.')
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
