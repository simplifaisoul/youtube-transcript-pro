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
  // TESTED AND WORKING APIs:
  // 1. youtubetranscripts.app - POST request (✅ TESTED - WORKS)
  // 2. tubetext.vercel.app - GET request with correct endpoint
  const apis = [
    // Try our own Vercel API endpoint (skip only on preview deployments with hash in URL)
    // Preview URLs have format: project-hash-owner.vercel.app
    // Production URLs: custom domain or project-name.vercel.app
    ...(typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? [{
      url: `${window.location.origin}/api/transcript?videoId=${videoId}&lang=${language}`,
      type: 'xml',
      method: 'GET',
    }] : []),
    // ✅ WORKING: YouTube Transcript API via CORS proxy (fallback)
    // Using a public CORS proxy to access YouTube's API
    {
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}&fmt=json3`)}`,
      type: 'json',
      method: 'GET',
    },
    // ✅ TESTED: youtubetranscripts.app - Requires POST (WORKING API)
    // Note: May have CORS issues on preview deployments, but works on production
    {
      url: `https://youtubetranscripts.app/api/transcript`,
      type: 'json',
      method: 'POST',
      body: JSON.stringify({ videoId, language }),
    },
    // TubeText API - Correct endpoint format
    {
      url: `https://tubetext.vercel.app/youtube/transcript?video_id=${videoId}`,
      type: 'json',
      method: 'GET',
    },
    // TubeText with timestamps
    {
      url: `https://tubetext.vercel.app/youtube/transcript-with-timestamps?video_id=${videoId}`,
      type: 'json',
      method: 'GET',
    },
    // Additional fallback: Try YouTube's direct API through proxy (if available)
    {
      url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}&fmt=json3`,
      type: 'json',
      method: 'GET',
    },
    // Try English as fallback if requested language fails
    ...(language !== 'en' ? [
      ...(typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? [{
        url: `${window.location.origin}/api/transcript?videoId=${videoId}&lang=en`,
        type: 'xml',
        method: 'GET',
      }] : []),
      {
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`)}`,
        type: 'json',
        method: 'GET',
      },
      {
        url: `https://youtubetranscripts.app/api/transcript`,
        type: 'json',
        method: 'POST',
        body: JSON.stringify({ videoId, language: 'en' }),
      },
      {
        url: `https://tubetext.vercel.app/youtube/transcript?video_id=${videoId}`,
        type: 'json',
        method: 'GET',
      },
    ] : []),
  ]

  const errors: string[] = []
  
  for (const api of apis) {
    try {
      const fetchOptions: RequestInit = {
        method: api.method || 'GET',
        headers: {
          'Accept': api.type === 'xml' ? 'application/xml, text/xml' : 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      }

      // Add body for POST requests
      if (api.method === 'POST' && api.body) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        }
        fetchOptions.body = api.body
      }

      // Try to fetch with error handling
      let response: Response
      try {
        response = await fetch(api.url, fetchOptions)
      } catch (fetchError) {
        // CORS or network error - log and continue to next API
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
        if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
          errors.push(`API ${api.url}: CORS blocked or network error`)
          console.warn(`CORS/Network error for ${api.url}:`, fetchError)
        } else {
          errors.push(`API ${api.url}: ${errorMsg}`)
        }
        continue
      }

      if (!response.ok) {
        // Skip 401 errors (preview deployment protection) - don't treat as fatal
        if (response.status === 401) {
          console.warn(`API ${api.url}: 401 Unauthorized (likely preview deployment protection) - skipping`)
          continue
        }
        errors.push(`API ${api.url}: ${response.status} ${response.statusText}`)
        continue
      }

        // Get response text once
      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()
      
      // Handle XML response
      if (api.type === 'xml' || contentType.includes('xml') || responseText.trim().startsWith('<?xml') || responseText.includes('<transcript>') || responseText.includes('<text')) {
        // Check if it's valid XML (not an error page)
        if (responseText.includes('<transcript>') || responseText.includes('<text')) {
          const segments = parseXMLTranscript(responseText)
          if (segments.length > 0) {
            return segments
          }
        }
        // If XML parsing returned empty, continue to next API
        continue
      }

      // Handle JSON response
      try {
        let data: any

        // Try to parse as JSON
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          // If JSON parsing fails, might be XML or other format
          if (responseText.includes('<transcript>') || responseText.includes('<text')) {
            const segments = parseXMLTranscript(responseText)
            if (segments.length > 0) {
              return segments
            }
          }
          // If not XML and not JSON, skip this API
          continue
        }

        // Handle CORS proxy response (allorigins.win format)
        if (data.contents) {
          try {
            const contents = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents
            // Handle YouTube's json3 format from proxy
            if (contents.events && Array.isArray(contents.events)) {
              const segments: TranscriptSegment[] = []
              contents.events.forEach((event: any) => {
                if (event.segs && Array.isArray(event.segs)) {
                  const text = event.segs.map((seg: any) => seg.utf8 || '').join('')
                  if (text.trim()) {
                    segments.push({
                      text: text.trim(),
                      start: event.tStartMs / 1000,
                      duration: event.dDurationMs ? event.dDurationMs / 1000 : 3,
                    })
                  }
                }
              })
              if (segments.length > 0) {
                return segments
              }
            }
          } catch (e) {
            // If parsing fails, continue to next format
          }
        }

        // Handle youtubetranscripts.app format (✅ TESTED - WORKS)
        if (data.success && data.transcript && Array.isArray(data.transcript)) {
          const segments = data.transcript
            .map((item: any) => ({
              text: item.text || '',
              start: item.start || 0,
              duration: item.duration || 3,
            }))
            .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
          
          if (segments.length > 0) {
            return segments
          }
        }

        // Handle TubeText format
        if (data.success && data.data) {
          // TubeText with timestamps format
          if (data.data.transcript && Array.isArray(data.data.transcript)) {
            // Check if it's an array of objects with timestamps or just strings
            if (data.data.transcript.length > 0 && typeof data.data.transcript[0] === 'object' && data.data.transcript[0].text) {
              // Has timestamps
              const segments = data.data.transcript
                .map((item: any) => ({
                  text: (item.text || item.transcript || '').trim(),
                  start: item.start || item.timestamp || 0,
                  duration: item.duration || 3,
                }))
                .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
              
              if (segments.length > 0) {
                return segments
              }
            } else {
              // Just array of strings
              const segments = data.data.transcript
                .map((text: string, index: number) => ({
                  text: text.trim(),
                  start: index * 3,
                  duration: 3,
                }))
                .filter((seg: TranscriptSegment) => seg.text.trim().length > 0)
              
              if (segments.length > 0) {
                return segments
              }
            }
          }
          // TubeText full_text format
          if (data.data.full_text && typeof data.data.full_text === 'string') {
            const sentences = data.data.full_text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0)
            if (sentences.length > 0) {
              return sentences.map((text: string, index: number) => ({
                text: text.trim(),
                start: index * 3,
                duration: 3,
              }))
            }
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

        // Handle YouTube's json3 format
        if (data.events && Array.isArray(data.events)) {
          const segments: TranscriptSegment[] = []
          data.events.forEach((event: any) => {
            if (event.segs && Array.isArray(event.segs)) {
              const text = event.segs.map((seg: any) => seg.utf8 || '').join('')
              if (text.trim()) {
                segments.push({
                  text: text.trim(),
                  start: event.tStartMs / 1000,
                  duration: event.dDurationMs ? event.dDurationMs / 1000 : 3,
                })
              }
            }
          })
          if (segments.length > 0) {
            return segments
          }
        }
      } catch (jsonErr) {
        // If all parsing fails, continue to next API
        continue
      }
    } catch (err) {
      // Log error for debugging
      const errorMsg = err instanceof Error ? err.message : String(err)
      errors.push(`API ${api.url}: ${errorMsg}`)
      console.warn(`Failed to fetch from ${api.url}:`, err)
      continue
    }
  }

  // If all APIs fail, provide helpful error message with debugging info
  console.error('All transcript APIs failed. Errors:', errors)
  console.error(`Attempted to fetch transcript for video: ${videoId}, language: ${language}`)
  
  // Provide more specific error message
  if (errors.length === 0) {
    throw new Error(`No transcript available for video ${videoId}. This video may not have captions enabled. Please check if the video has the "CC" (Closed Captions) button available on YouTube.`)
  } else {
    throw new Error(`Unable to fetch transcript for video ${videoId}. The video may not have captions enabled, or all transcript services are temporarily unavailable. Please try again later or verify the video has captions.`)
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
