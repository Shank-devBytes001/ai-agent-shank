import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { 
  Send, 
  Settings, 
  Loader2, 
  Bot, 
  User, 
  ArrowLeft,
  Trash2,
  RefreshCw
} from 'lucide-react'

// Get API base URL for streaming
// In development with proxy, use relative path; in production use full URL
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // In development, construct full URL from window.location
  return `${window.location.protocol}//${window.location.hostname}:5000/api`
}

export default function ProjectChat() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchProject()
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/projects/${id}`)
      setProject(response.data.project)
      setMessages(response.data.project.messages || [])
    } catch (err) {
      setError('Failed to load project')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fast streaming submit handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)
    setError('')
    setStreamingContent('')

    // Optimistically add user message
    const tempUserMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const token = localStorage.getItem('token')
      
      // Use regular fetch for streaming SSE
      const response = await fetch(`${getApiBase()}/chat/${id}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let finalMessage = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (!data || data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'user_message') {
                // Update temp user message with real one
                setMessages(prev => 
                  prev.map(m => m.id === tempUserMsg.id ? parsed.data : m)
                )
              } else if (parsed.type === 'chunk') {
                // Stream content character by character
                fullContent += parsed.data
                setStreamingContent(fullContent)
              } else if (parsed.type === 'done') {
                finalMessage = parsed.data
              } else if (parsed.type === 'error') {
                throw new Error(parsed.data)
              }
            } catch (parseErr) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add final assistant message
      if (finalMessage) {
        setMessages(prev => [...prev, finalMessage])
      } else if (fullContent) {
        // Fallback if done message wasn't received
        setMessages(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date().toISOString()
        }])
      }
      setStreamingContent('')

    } catch (err) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to send message')
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      setStreamingContent('')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleClearChat = async () => {
    if (!confirm('Clear all messages? This cannot be undone.')) return

    try {
      await api.delete(`/projects/${id}/messages`)
      setMessages([])
    } catch (err) {
      console.error('Failed to clear chat:', err)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <p className="text-dark-400 mb-4">Project not found</p>
        <Link to="/dashboard" className="text-primary-400 hover:text-primary-300">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="font-semibold text-white">{project.name}</h1>
            <p className="text-sm text-dark-400">{messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <Link
            to={`/project/${id}/settings`}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && !streamingContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start a conversation</h3>
            <p className="text-dark-400 max-w-md">
              {project.systemPrompt 
                ? 'Your agent is ready to chat. Send a message to begin!'
                : 'Configure a system prompt in settings to customize your agent\'s behavior'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-4 animate-fade-in ${message.role === 'user' ? 'justify-end' : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-400" />
                  </div>
                )}
                <div className={`max-w-[80%] lg:max-w-[60%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-dark-900 rounded-tr-sm'
                        : 'bg-dark-800 text-dark-100 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-dark-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex gap-4 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-400" />
                </div>
                <div className="max-w-[80%] lg:max-w-[60%]">
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-dark-800 text-dark-100">
                    <p className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-2 h-4 bg-primary-400 animate-pulse ml-1" /></p>
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator (only when sending but no streaming content yet) */}
            {sending && !streamingContent && (
              <div className="flex gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-dark-800">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-dark-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700/50 bg-dark-900/50 backdrop-blur-xl">
        <div className="flex gap-4 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-6 py-3 rounded-xl bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
