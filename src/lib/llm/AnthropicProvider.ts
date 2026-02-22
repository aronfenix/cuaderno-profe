import type { LLMProvider, LLMStreamChunk, LLMSettings } from './LLMProvider'
import type { ChatMessage } from '../../types'

/**
 * Anthropic Claude provider via /api/claude proxy.
 * In dev: Vite proxies /api/claude → https://api.anthropic.com
 * In prod: Express server.js proxies /api/claude → https://api.anthropic.com
 * The API key is injected server-side, NEVER sent from the client.
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'Anthropic Claude'
  private model: string
  private apiKey: string

  constructor(settings: LLMSettings) {
    this.model = settings.model || 'claude-3-5-haiku-20241022'
    this.apiKey = settings.anthropicApiKey
  }

  get isConfigured(): boolean {
    return !!this.apiKey
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: LLMStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<void> {
    // Separate system from user/assistant messages
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const body = {
      model: this.model,
      max_tokens: 4096,
      stream: true,
      system: systemMsg?.content,
      messages: chatMessages,
    }

    const response = await fetch('/api/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          onChunk({ delta: '', done: true })
          return
        }
        try {
          const event = JSON.parse(data)
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            onChunk({ delta: event.delta.text, done: false })
          } else if (event.type === 'message_stop') {
            onChunk({ delta: '', done: true })
            return
          }
        } catch {
          // Ignore parse errors for incomplete SSE lines
        }
      }
    }

    onChunk({ delta: '', done: true })
  }
}
