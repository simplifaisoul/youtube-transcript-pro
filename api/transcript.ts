// Vercel serverless function to fetch YouTube transcripts (bypasses CORS)
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
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
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`
    const response = await fetch(url)
    
    if (!response.ok) {
      // Try English as fallback
      const enUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`
      const enResponse = await fetch(enUrl)
      
      if (!enResponse.ok) {
        return res.status(404).json({ error: 'Transcript not available' })
      }
      
      const xml = await enResponse.text()
      return res.status(200).send(xml)
    }

    const xml = await response.text()
    res.status(200).send(xml)
  } catch (error) {
    console.error('Transcript fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch transcript' })
  }
}
