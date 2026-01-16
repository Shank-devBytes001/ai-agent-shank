import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  Trash2, 
  FileText,
  Bot,
  AlertTriangle
} from 'lucide-react'

export default function ProjectSettings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: ''
  })

  useEffect(() => {
    fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`)
      setProject(response.data.project)
      setFormData({
        name: response.data.project.name,
        description: response.data.project.description || '',
        systemPrompt: response.data.project.systemPrompt || ''
      })
      setFiles(response.data.project.files || [])
    } catch (err) {
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.put(`/projects/${id}`, formData)
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const response = await api.uploadFile(`/files/${id}`, file)
      setFiles([response.data.file, ...files])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return

    try {
      await api.delete(`/files/${id}/${fileId}`)
      setFiles(files.filter(f => f.id !== fileId))
    } catch (err) {
      setError('Failed to delete file')
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/projects/${id}`)
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to delete project')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to={`/project/${id}`}
          className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Project Settings</h1>
            <p className="text-sm text-dark-400">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-fade-in">
          {success}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6 mb-8">
        <div className="p-6 rounded-2xl bg-dark-800/50 border border-dark-700/50 space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              placeholder="What does this agent do?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              System Prompt
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-dark-900 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-none font-mono text-sm"
              placeholder="You are a helpful assistant that..."
            />
            <p className="mt-2 text-xs text-dark-500">
              This defines your agent's personality, knowledge, and behavior.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Files Section */}
      <div className="p-6 rounded-2xl bg-dark-800/50 border border-dark-700/50 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.pdf,.json,.md,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif"
            />
            <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white text-sm transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </span>
          </label>
        </div>

        {files.length === 0 ? (
          <p className="text-dark-500 text-center py-8">No files uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-dark-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white truncate max-w-[200px]">{file.originalName}</p>
                    <p className="text-xs text-dark-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-dark-400 mb-4">
              Once you delete a project, there is no going back. All messages and files will be permanently removed.
            </p>
            <button
              onClick={handleDeleteProject}
              className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


