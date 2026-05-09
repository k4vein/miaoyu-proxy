export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST' })

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
  if (!DEEPSEEK_API_KEY) return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY 环境变量' })

  const { messages, model = 'deepseek-chat', max_tokens = 2048, temperature = 0.85, stream = false } = req.body

  if (!messages) return res.status(400).json({ error: '缺少 messages 参数' })

  try {
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature, stream }),
    })

    if (stream) {
      // SSE 流式
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = upstream.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      res.end()
    } else {
      const data = await upstream.json()
      res.status(upstream.status).json(data)
    }
  } catch (err) {
    console.error('代理错误:', err)
    res.status(500).json({ error: '代理服务器错误', detail: err.message })
  }
}
