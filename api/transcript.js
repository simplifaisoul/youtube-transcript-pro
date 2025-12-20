// Vercel serverless function to fetch YouTube transcripts (bypasses CORS)
// Using named exports for better Vercel compatibility

export async function GET(request) {
  return handleRequest(request, 'GET')
}

export async function POST(request) {
  return handleRequest(request, 'POST')
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

async function handleRequest(request, method) {
  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle both GET and POST
  let videoId
  let lang = 'en'
  
  if (method === 'POST') {
    try {
      const body = await request.json()
      videoId = body?.videoId
      lang = body?.lang || body?.language || 'en'
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else {
    const url = new URL(request.url)
    videoId = url.searchParams.get('videoId')
    lang = url.searchParams.get('lang') || 'en'
  }

  if (!videoId || (typeof videoId !== 'string' && typeof videoId !== 'number')) {
    return new Response(JSON.stringify({ error: 'videoId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const videoIdStr = String(videoId)
  const langStr = String(lang || 'en')

  try {
    // First, try to get caption tracks list to find available languages
    try {
      const tracksUrl = `https://www.youtube.com/api/timedtext?v=${videoIdStr}&type=list`
      const tracksResponse = await fetch(tracksUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      
      if (tracksResponse.ok) {
        const tracksXml = await tracksResponse.text()
        // Extract available language codes from the tracks list
        const langMatches = tracksXml.match(/lang_code="([^"]+)"/g)
        if (langMatches && langMatches.length > 0) {
          const availableLangs = langMatches.map(m => {
            const match = m.match(/lang_code="([^"]+)"/)
            return match ? match[1] : null
          }).filter(Boolean)
          // Try requested language first, then available languages
          const languagesToTry = [langStr, ...availableLangs, 'en', 'en-US', 'en-GB']
          
          for (const tryLang of languagesToTry) {
            if (!tryLang) continue
            try {
              const url = `https://www.youtube.com/api/timedtext?v=${videoIdStr}&lang=${tryLang}&fmt=srv3`
              const response = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              })
              
              if (response.ok) {
                const xml = await response.text()
                if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
                  return new Response(xml, {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
                  })
                }
              }
            } catch (err) {
              continue
            }
          }
        }
      }
    } catch (err) {
      // If tracks list fails, continue with direct attempts
    }
    
    // Try YouTube's API directly (server-side, no CORS issues)
    const languages = [langStr, 'en', 'en-US', 'en-GB', 'en-CA', 'en-AU']
    
    for (const tryLang of languages) {
      try {
        // Try different formats
        const formats = ['srv3', 'srv1', 'srv2', 'ttml', 'vtt']
        for (const fmt of formats) {
          try {
            const url = `https://www.youtube.com/api/timedtext?v=${videoIdStr}&lang=${tryLang}&fmt=${fmt}`
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            })
            
            if (response.ok) {
              const xml = await response.text()
              if (xml && (xml.includes('<transcript>') || xml.includes('<text') || xml.includes('WEBVTT'))) {
                return new Response(xml, {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
                })
              }
            }
          } catch (err) {
            continue
          }
        }
      } catch (err) {
        continue
      }
    }
    
    return new Response(JSON.stringify({ error: 'Transcript not available for this video. The video may not have captions enabled.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Transcript fetch error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch transcript' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
