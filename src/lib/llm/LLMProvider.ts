import type { ChatMessage } from '../../types'

export interface LLMStreamChunk {
  delta: string
  done: boolean
}

export interface LLMProvider {
  readonly name: string
  readonly isConfigured: boolean
  streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: LLMStreamChunk) => void,
    signal?: AbortSignal
  ): Promise<void>
}

export interface LLMSettings {
  anthropicApiKey: string
  model: string  // e.g. "claude-3-5-haiku-20241022"
}

export function getLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem('llmSettings')
    if (!raw) return { anthropicApiKey: '', model: 'claude-3-5-haiku-20241022' }
    return JSON.parse(raw)
  } catch {
    return { anthropicApiKey: '', model: 'claude-3-5-haiku-20241022' }
  }
}

export function saveLLMSettings(settings: LLMSettings): void {
  localStorage.setItem('llmSettings', JSON.stringify(settings))
}
