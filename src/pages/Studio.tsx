import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RubricPreview } from '../components/rubric/RubricPreview'
import { AnthropicProvider } from '../lib/llm/AnthropicProvider'
import {
  SYSTEM_PROMPT_GENERATE, SYSTEM_PROMPT_ITERATE,
  buildIntakeMessage, buildIterateMessage, validateAndFixTemplate
} from '../lib/llm/prompts'
import { getLLMSettings } from '../lib/llm/LLMProvider'
import { TemplatesRepo } from '../db/repos/TemplatesRepo'
import { getDeviceId } from '../db/repos/deviceId'
import type { ChatMessage, InstrumentTemplate, LLMStudioState } from '../types'
import './Studio.css'

export function Studio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamBuffer, setStreamBuffer] = useState('')
  const [currentTemplate, setCurrentTemplate] = useState<InstrumentTemplate | null>(null)
  const [studioState, setStudioState] = useState<LLMStudioState>('intake')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Load template for editing
  useEffect(() => {
    if (!editId) return
    TemplatesRepo.getById(editId).then(t => {
      if (t) {
        setCurrentTemplate(t)
        setStudioState('iterate')
        setMessages([{
          role: 'assistant',
          content: `📋 Editando rúbrica: **${t.title}** (v${t.version}). Describe los cambios que quieres hacer.`
        }])
      }
    })
  }, [editId])

  const llmSettings = getLLMSettings()
  const provider = useMemo(() => {
    if (!llmSettings.anthropicApiKey) return null
    return new AnthropicProvider(llmSettings)
  }, [llmSettings.anthropicApiKey, llmSettings.model])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuffer])

  const sendMessage = useCallback(async (userText: string) => {
    if (isStreaming || !userText.trim()) return
    setError(null)
    setValidationError(null)

    const userMessage: ChatMessage = { role: 'user', content: userText }
    const isFirstMessage = messages.length === 0

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputText('')

    if (!provider) {
      // Fallback: no LLM, just ack
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ LLM no configurado. Puedes editar la rúbrica manualmente en el panel derecho, o configurar tu API key en Ajustes.'
      }])
      return
    }

    const isIterate = studioState === 'iterate' && currentTemplate !== null

    const systemPrompt = isIterate ? SYSTEM_PROMPT_ITERATE : SYSTEM_PROMPT_GENERATE
    const userContent = isIterate
      ? buildIterateMessage(userText, currentTemplate)
      : buildIntakeMessage(userText)

    // Replace last user message content for LLM
    const llmMessages: ChatMessage[] = [
      ...newMessages.slice(0, -1),
      { role: 'user', content: userContent }
    ]

    setIsStreaming(true)
    setStreamBuffer('')
    setStudioState('generate')

    const controller = new AbortController()
    abortRef.current = controller

    let fullResponse = ''
    try {
      await provider.streamChat(
        [{ role: 'system', content: systemPrompt }, ...llmMessages],
        ({ delta, done }) => {
          fullResponse += delta
          setStreamBuffer(fullResponse)
          if (done) {
            const result = validateAndFixTemplate(fullResponse)
            if ('error' in result) {
              setValidationError(result.error)
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error en el JSON generado: ${result.error}\n\nPide al modelo que corrija o edita manualmente.`
              }])
            } else {
              const now = Date.now()
              const template: InstrumentTemplate = {
                ...result,
                id: editId ?? currentTemplate?.id,
                version: (currentTemplate?.version ?? 0) + 1,
                createdAt: currentTemplate?.createdAt ?? now,
                updatedAt: now,
                source: 'ai',
                syncStatus: 'pending',
                deviceId: getDeviceId(),
              }
              setCurrentTemplate(template)
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Rúbrica generada: **${template.title}** con ${template.criteria.length} criterios. Puedes pedir cambios o guardarla.`
              }])
              setStudioState('iterate')
            }
          }
        },
        controller.signal
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        const msg = '❌ Error de conexión con el LLM. Puedes editar la rúbrica manualmente.'
        setError(msg)
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      }
    } finally {
      setIsStreaming(false)
      setStreamBuffer('')
      abortRef.current = null
    }
  }, [isStreaming, messages, studioState, currentTemplate, provider, editId])

  const handleSave = useCallback(async () => {
    if (!currentTemplate || saving) return
    setSaving(true)
    try {
      const summary = messages
        .slice(-6)
        .map(m => `${m.role}: ${m.content.slice(0, 120)}`)
        .join('\n')

      const templateData = {
        ...currentTemplate,
        conversationSummary: summary,
        updatedAt: Date.now(),
        syncStatus: 'pending' as const,
      }

      if (editId && currentTemplate.id) {
        await TemplatesRepo.update(editId, templateData)
      } else {
        const { id: _dropId, ...createData } = templateData
        await TemplatesRepo.create(createData)
      }
      navigate('/library')
    } finally {
      setSaving(false)
    }
  }, [currentTemplate, saving, editId, messages, navigate])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  const noApiKey = !llmSettings.anthropicApiKey

  return (
    <div className="studio-layout">
      {/* Chat panel */}
      <aside className="studio-chat">
        <div className="studio-chat-header">
          <button className="btn-icon" onClick={() => navigate('/library')}>←</button>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>🤖 Rubric Studio</h2>
        </div>

        {noApiKey && (
          <div className="studio-api-warning">
            ⚠️ Sin API key de Anthropic. Edita la rúbrica manualmente o{' '}
            <a href="#settings" onClick={() => navigate('/settings')}>configura la API</a>.
          </div>
        )}

        <div className="studio-messages">
          {messages.length === 0 && (
            <div className="studio-welcome">
              <p>👋 Describe la actividad que quieres evaluar y te propongo una rúbrica.</p>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: 'var(--s-2)' }}>
                Ej: "Exposición oral de 5 min sobre un tema libre, para 6º de Primaria. Quiero valorar contenido, claridad, vocabulario y actitud."
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              <div className="chat-bubble-content">{msg.content}</div>
            </div>
          ))}

          {isStreaming && streamBuffer && (
            <div className="chat-bubble assistant streaming">
              <div className="chat-bubble-content">{streamBuffer}</div>
            </div>
          )}

          {isStreaming && !streamBuffer && (
            <div className="chat-bubble assistant">
              <div className="chat-bubble-content">
                <div className="typing-dots"><span/><span/><span/></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="studio-input-area">
          <textarea
            className="studio-textarea"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={studioState === 'iterate' ? 'Pide cambios en lenguaje natural...' : 'Describe la actividad...'}
            rows={3}
            disabled={isStreaming}
          />
          <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
            {isStreaming ? (
              <button className="btn btn-secondary w-full" onClick={() => abortRef.current?.abort()}>
                Detener
              </button>
            ) : (
              <button
                className="btn btn-primary w-full"
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim()}
              >
                {studioState === 'intake' ? 'Generar propuesta' : 'Refinar'}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Preview panel */}
      <main className="studio-preview">
        <div className="studio-preview-header">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Vista previa</h3>
          {currentTemplate && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : '💾 Guardar plantilla'}
            </button>
          )}
        </div>

        {validationError && (
          <div style={{
            background: 'var(--color-danger-light)', color: 'var(--color-danger)',
            padding: 'var(--s-3)', margin: 'var(--s-3)', borderRadius: 'var(--r-md)',
            fontSize: '0.875rem'
          }}>
            ⚠️ {validationError}
          </div>
        )}

        {currentTemplate ? (
          <RubricPreview
            template={currentTemplate}
            editable
            onEdit={setCurrentTemplate}
          />
        ) : (
          <div className="studio-preview-empty">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--s-4)' }}>📋</div>
            <p style={{ color: 'var(--color-muted)' }}>
              La rúbrica aparecerá aquí cuando el modelo la genere.
            </p>
            {noApiKey && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 'var(--s-4)' }}
                onClick={() => {
                  const empty: InstrumentTemplate = {
                    title: '', description: '', tags: [],
                    scale: { type: '1-5', allowNA: true },
                    finalGrade: { scale: '1-10', rounding: '0.5' },
                    criteria: [],
                    version: 1, createdAt: Date.now(), updatedAt: Date.now(),
                    source: 'manual', syncStatus: 'pending', deviceId: getDeviceId()
                  }
                  setCurrentTemplate(empty)
                  setStudioState('iterate')
                }}
              >
                Crear rúbrica manualmente
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
