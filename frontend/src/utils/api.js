// Use environment variable for API URL, fallback to relative path for dev with proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`
    const options = {
      method,
      headers: this.getHeaders()
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    const json = await response.json()

    if (!response.ok) {
      const error = new Error(json.error || 'Request failed')
      error.response = { data: json, status: response.status }
      throw error
    }

    return { data: json, status: response.status }
  }

  get(endpoint) {
    return this.request('GET', endpoint)
  }

  post(endpoint, data) {
    return this.request('POST', endpoint, data)
  }

  put(endpoint, data) {
    return this.request('PUT', endpoint, data)
  }

  delete(endpoint) {
    return this.request('DELETE', endpoint)
  }

  // Special method for file uploads
  async uploadFile(endpoint, file) {
    const url = `${this.baseUrl}${endpoint}`
    const formData = new FormData()
    formData.append('file', file)

    const headers = {}
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    })

    const json = await response.json()

    if (!response.ok) {
      const error = new Error(json.error || 'Upload failed')
      error.response = { data: json, status: response.status }
      throw error
    }

    return { data: json, status: response.status }
  }
}

const api = new ApiClient()
export default api
