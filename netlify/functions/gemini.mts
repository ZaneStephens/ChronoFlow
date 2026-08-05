import { GoogleGenAI } from '@google/genai'

type GenerateContentRequest = {
  model?: unknown
  contents?: unknown
  config?: unknown
}

const MODEL = 'gemini-3.5-flash'

const createAiClient = () => {
  const apiKey = process.env.API_KEY
  return apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI({})
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  }

  let body: GenerateContentRequest

  try {
    body = await request.json() as GenerateContentRequest
  } catch {
    return Response.json({ error: 'Invalid JSON request.' }, { status: 400 })
  }

  if (body.model !== MODEL || typeof body.contents !== 'string') {
    return Response.json({ error: 'A model and text contents are required.' }, { status: 400 })
  }

  try {
    const ai = createAiClient()
    const response = await ai.models.generateContent({
      model: body.model,
      contents: body.contents,
      ...(body.config && typeof body.config === 'object' ? { config: body.config } : {})
    })

    return Response.json({ text: response.text })
  } catch (error) {
    console.error('Gemini function error:', error)
    return Response.json({ error: 'Unable to generate AI content.' }, { status: 502 })
  }
}

export const config = {
  path: '/api/gemini',
  method: 'POST'
}
