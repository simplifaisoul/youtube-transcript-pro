// Vercel serverless function to fetch YouTube transcripts (bypasses CORS)
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { videoId, lang = 'en' } = req.query

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'videoId is required' })
  }

  try {
    // First, try to get caption tracks list to find available languages
    try {
      const tracksUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`
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
          const availableLangs = langMatches.map(m => m.match(/lang_code="([^"]+)"/)?.[1]).filter(Boolean)
          // Try requested language first, then available languages
          const languagesToTry = [lang, ...availableLangs, 'en', 'en-US', 'en-GB']
          
          for (const tryLang of languagesToTry) {
            if (!tryLang) continue
            try {
              const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${tryLang}&fmt=srv3`
              const response = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              })
              
              if (response.ok) {
                const xml = await response.text()
                if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
                  res.setHeader('Content-Type', 'application/xml')
                  return res.status(200).send(xml)
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
    const languages = [lang, 'en', 'en-US', 'en-GB', 'en-CA', 'en-AU']
    
    for (const tryLang of languages) {
      try {
        // Try different formats
        const formats = ['srv3', 'srv1', 'srv2', 'ttml', 'vtt']
        for (const fmt of formats) {
          try {
            const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${tryLang}&fmt=${fmt}`
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            })
            
            if (response.ok) {
              const xml = await response.text()
              if (xml && (xml.includes('<transcript>') || xml.includes('<text') || xml.includes('WEBVTT'))) {
                res.setHeader('Content-Type', 'application/xml')
                return res.status(200).send(xml)
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
    
    return res.status(404).json({ error: 'Transcript not available for this video. The video may not have captions enabled.' })
  } catch (error) {
    console.error('Transcript fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch transcript' })
  }
}
