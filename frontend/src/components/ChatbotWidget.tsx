'use client'
import { useState, useRef, useEffect } from 'react'
import api from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

async function buildContext(): Promise<string> {
  let ctx = ''

  try {
    const { data } = await api.get('/api/v1/schools/')
    const schools = Array.isArray(data) ? data : (data?.items ?? [])
    if (schools.length > 0) {
      ctx += `\nSchools managed:\n` + schools.slice(0, 10)
        .map((s: any) => `- ${s.name} (${s.city || s.location || 'N/A'})`)
        .join('\n')
    }
  } catch (e) { console.warn('schools fetch failed', e) }

  try {
    const { data } = await api.get('/api/v1/users/')
    const users = Array.isArray(data) ? data : (data?.items ?? [])
    if (users.length > 0) {
      ctx += `\n\nTotal users: ${users.length}`
    }
  } catch (e) { console.warn('users fetch failed', e) }

  return ctx || 'No additional context available.'
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m Nyxion AI. Ask me anything about your schools or platform.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const context = await buildContext()
      const { data } = await api.post('/api/v1/ai/chatbot', {
        message: text,
        school_context: context,
      })
      setMessages([...newMessages, { role: 'assistant', content: data.response }])
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
            <span>✨</span> Nyxion AI
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl leading-snug ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-2xl rounded-bl-sm text-xs">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 px-3 py-2 flex gap-2">
            <input
              className="flex-1 text-sm outline-none text-slate-800 placeholder-slate-400"
              placeholder="Ask something..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button
              onClick={send}
              disabled={loading}
              className="text-blue-600 font-semibold text-sm disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}