import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Trash2, 
  Loader2,
  Bot,
  Calendar,
  FileText,
  Sparkles,
  X
} from 'lucide-react'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', systemPrompt: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const response = await api.post('/projects', newProject)
      setProjects([response.data.project, ...projects])
      setShowModal(false)
      setNewProject({ name: '', description: '', systemPrompt: '' })
      navigate(`/project/${response.data.project.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProject = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/projects/${id}`)
      setProjects(projects.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Projects</h1>
          <p className="text-dark-400">Create and manage your AI chatbot agents</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-dark-900 font-semibold hover:from-primary-400 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-800/50 flex items-center justify-center">
            <Bot className="w-10 h-10 text-dark-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-dark-400 mb-6">Create your first AI agent to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </button>
        </div>
      ) : (
        /* Projects grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group block p-6 rounded-2xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/50 hover:bg-dark-800 transition-all animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/project/${project.id}/settings`)
                    }}
                    className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-dark-400 text-sm mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>

              <div className="flex items-center gap-4 text-xs text-dark-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {project._count?.messages || 0} messages
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {project._count?.files || 0} files
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700/50 flex items-center gap-1 text-xs text-dark-500">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(project.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  placeholder="My AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  placeholder="A helpful assistant for customer support"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={newProject.systemPrompt}
                  onChange={(e) => setNewProject({ ...newProject, systemPrompt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-none"
                  placeholder="You are a helpful assistant that..."
                />
                <p className="mt-2 text-xs text-dark-500">
                  Define your agent's personality and behavior
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-dark-700 text-dark-300 hover:bg-dark-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


