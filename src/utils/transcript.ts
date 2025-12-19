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
    // Try multiple free APIs as fallback
    const apis = [
      `https://tubetext.vercel.app/api/transcript?videoId=${videoId}&lang=${language}`,
      `https://youtubetranscripts.app/api?videoId=${videoId}&lang=${language}`,
      `https://getvideotranscript.com/api?videoId=${videoId}&lang=${language}`,
    ]

    for (const apiUrl of apis) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          continue
        }

        const data = await response.json()

        // Handle different API response formats
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            text: item.text || item.transcript || item.caption || '',
            start: item.start || item.startTime || item.offset || 0,
            duration: item.duration || item.dur || 0,
          }))
        }

        if (data.transcript || data.segments || data.captions) {
          const segments = data.transcript || data.segments || data.captions
          return segments.map((item: any) => ({
            text: item.text || item.transcript || item.caption || '',
            start: item.start || item.startTime || item.offset || 0,
            duration: item.duration || item.dur || 0,
          }))
        }

        if (data.text) {
          // Single text response - split by sentences or timestamps
          return [{ text: data.text, start: 0, duration: 0 }]
        }
      } catch (err) {
        console.warn(`API ${apiUrl} failed:`, err)
        continue
      }
    }

    // Fallback: Use YouTube's internal API (may require CORS proxy)
    const fallbackUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}`
    const response = await fetch(fallbackUrl)
    
    if (response.ok) {
      const xml = await response.text()
      return parseXMLTranscript(xml)
    }

    throw new Error('Failed to fetch transcript from all available sources')
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
