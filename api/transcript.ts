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
    // Try YouTube's API directly (server-side, no CORS issues)
    const languages = [lang, 'en', 'en-US', 'en-GB']
    
    for (const tryLang of languages) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${tryLang}&fmt=srv3`
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        
        if (response.ok) {
          const xml = await response.text()
          // Check if we got valid XML
          if (xml && (xml.includes('<transcript>') || xml.includes('<text'))) {
            res.setHeader('Content-Type', 'application/xml')
            return res.status(200).send(xml)
          }
        }
      } catch (err) {
        // Continue to next language
        continue
      }
    }
    
    // If all direct attempts fail, try alternative format
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`
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
      // Ignore
    }
    
    return res.status(404).json({ error: 'Transcript not available for this video' })
  } catch (error) {
    console.error('Transcript fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch transcript' })
  }
}
