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
  // Try multiple APIs with better error handling - prioritize CORS-enabled APIs
  const apis = [
    // Try our own Vercel API endpoint first (if deployed on Vercel)
    {
      url: window.location.origin + `/api/transcript?videoId=${videoId}&lang=${language}`,
      type: 'xml',
    },
    // CORS-enabled APIs (try next - these work from browser)
    {
      url: `https://youtubetranscripts.app/api?videoId=${videoId}&lang=${language}`,
      type: 'json',
    },
    {
      url: `https://tubetext.vercel.app/api/transcript?videoId=${videoId}&lang=${language}`,
      type: 'json',
    },
    {
      url: `https://getvideotranscript.com/api?videoId=${videoId}&lang=${language}`,
      type: 'json',
    },
    // Alternative API endpoints
    {
      url: `https://youtubetranscripts.app/api?videoId=${videoId}`,
      type: 'json',
    },
    // Try English as fallback if requested language fails
    ...(language !== 'en' ? [
      {
        url: `/api/transcript?videoId=${videoId}&lang=en`,
        type: 'xml',
      },
      {
        url: `https://youtubetranscripts.app/api?videoId=${videoId}&lang=en`,
        type: 'json',
      },
      {
        url: `https://tubetext.vercel.app/api/transcript?videoId=${videoId}&lang=en`,
        type: 'json',
      },
    ] : []),
  ]

  const errors: string[] = []
  
  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': api.type === 'xml' ? 'application/xml, text/xml' : 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      })

      if (!response.ok) {
        errors.push(`API ${api.url}: ${response.status} ${response.statusText}`)
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
        const contentType = response.headers.get('content-type') || ''
        let data: any

        // Try to parse as JSON first
        if (contentType.includes('json') || api.type === 'json') {
          try {
            data = await response.json()
          } catch (e) {
            // If JSON parsing fails, try as text
            const text = await response.text()
            // Check if it's XML
            if (text.includes('<transcript>') || text.includes('<text')) {
              const segments = parseXMLTranscript(text)
              if (segments.length > 0) {
                return segments
              }
            }
            // Try to parse as JSON from text
            try {
              data = JSON.parse(text)
            } catch {
              continue
            }
          }
        } else {
          // Try as text first
          const text = await response.text()
          if (text.includes('<transcript>') || text.includes('<text')) {
            const segments = parseXMLTranscript(text)
            if (segments.length > 0) {
              return segments
            }
          }
          try {
            data = JSON.parse(text)
          } catch {
            continue
          }
        }

        // Handle different API response formats
        if (Array.isArray(data)) {
          const segments = data
            .map((item: any) => ({
              text: item.text || item.transcript || item.caption || item.content || item.snippet || '',
              start: item.start || item.startTime || item.offset || item.timestamp || item.time || 0,
              duration: item.duration || item.dur || item.length || 3,
            }))
            .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        if (data.transcript || data.segments || data.captions || data.items || data.data) {
          const segmentsArray = data.transcript || data.segments || data.captions || data.items || data.data
          if (Array.isArray(segmentsArray)) {
            const segments = segmentsArray
              .map((item: any) => ({
                text: item.text || item.transcript || item.caption || item.content || item.snippet || '',
                start: item.start || item.startTime || item.offset || item.timestamp || item.time || 0,
                duration: item.duration || item.dur || item.length || 3,
              }))
              .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
            
            if (segments.length > 0) {
              return segments
            }
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
        // If all parsing fails, continue to next API
        continue
      }
    } catch (err) {
      // Silently continue to next API
      continue
    }
  }

  // If all APIs fail, provide helpful error message with debugging info
  console.error('All transcript APIs failed. Errors:', errors)
  throw new Error(`Unable to fetch transcript for video ${videoId}. The video may not have captions enabled, or all transcript services are temporarily unavailable. Please try again later or verify the video has captions.`)
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
