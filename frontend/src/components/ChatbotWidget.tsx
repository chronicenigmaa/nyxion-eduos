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
    const { data } = await api.get('/api/v1/teachers/')
    const teachers = Array.isArray(data) ? data : []
    ctx += `\nTotal teachers: ${teachers.length}`
    if (teachers.length > 0) {
      ctx += `\nTeacher list: ` + teachers.slice(0, 10)
        .map((t: any) => `${t.name} (${t.subject || t.specialization || 'N/A'})`)
        .join(', ')
    }
  } catch (e) { console.warn('teachers failed', e) }

  try {
    const { data } = await api.get('/api/v1/students/')
    const students = Array.isArray(data) ? data : []
    ctx += `\nTotal students: ${students.length}`
    if (students.length > 0) {
      ctx += `\nClasses represented: ` + [...new Set(students.map((s: any) => s.class_name || s.class).filter(Boolean))].join(', ')
    }
  } catch (e) { console.warn('students failed', e) }

  try {
    const { data } = await api.get('/api/v1/fees/summary')
    ctx += `\nFee summary: ${JSON.stringify(data)}`
  } catch (e) { console.warn('fees failed', e) }

  try {
    const { data } = await api.get('/api/v1/academics/classes')
    const classes = Array.isArray(data) ? data : []
    if (classes.length > 0) {
      ctx += `\nClasses: ` + classes.map((c: any) => c.name || c.class_name).join(', ')
    }
  } catch (e) { console.warn('classes failed', e) }

  try {
    const { data } = await api.get('/api/v1/assignments/')
    const assignments = Array.isArray(data) ? data : []
    ctx += `\nTotal assignments: ${assignments.length}`
  } catch (e) { console.warn('assignments failed', e) }

  return ctx || 'No data available.'
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Nyxion AI. Ask me anything about your school — teachers, students, fees, assignments, and more." }
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
                <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-2xl rounded-bl-sm text-xs animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 px-3 py-2 flex gap-2 items-center">
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