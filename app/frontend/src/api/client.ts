/**
 * API Client for YouTube Thumbnail Generator
 * 
 * Handles all communication with the FastAPI backend, including
 * authentication, error handling, and request/response transformation.
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import type { 
  ThumbnailRequest, 
  ThumbnailResponse, 
  ThumbnailListResponse, 
  HealthResponse,
  ErrorResponse,
  ApiError 
} from '../types'

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('API Request Error:', error)
        return Promise.reject(error)
      }
    )
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error: AxiosError) => {
        const apiError = this.handleApiError(error)
        console.error('API Response Error:', apiError)
        return Promise.reject(apiError)
      }
    )
  }
  
  private handleApiError(error: AxiosError): ApiError {
    const apiError = new Error() as ApiError
    
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data as ErrorResponse
      apiError.message = errorData?.message || `HTTP ${error.response.status}`
      apiError.status = error.response.status
      apiError.response = errorData
    } else if (error.request) {
      // Request made but no response received
      apiError.message = 'Network error - please check your connection'
      apiError.status = 0
    } else {
      // Something else happened
      apiError.message = error.message || 'An unexpected error occurred'
    }
    
    return apiError
  }
  
  // Health check endpoint
  async healthCheck(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health')
    return response.data
  }
  
  // Generate thumbnail
  async generateThumbnail(request: ThumbnailRequest): Promise<ThumbnailResponse> {
    if (IS_DEMO_MODE) {
      return this.mockGenerateThumbnail(request)
    }
    
    // Create FormData for multipart request
    const formData = new FormData()
    formData.append('title', request.title)
    formData.append('topic', request.topic)
    
    if (request.accent_color) {
      formData.append('accent_color', request.accent_color)
    }
    
    if (request.logo) {
      formData.append('logo', request.logo)
    }
    
    const response = await this.client.post<ThumbnailResponse>(
      '/api/generate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for generation
      }
    )
    
    return response.data
  }
  
  // List thumbnails
  async listThumbnails(limit = 20): Promise<ThumbnailListResponse> {
    if (IS_DEMO_MODE) {
      return this.mockListThumbnails(limit)
    }
    
    const response = await this.client.get<ThumbnailListResponse>(
      '/api/thumbnails',
      { params: { limit } }
    )
    
    return response.data
  }
  
  // Get thumbnail file URL
  getThumbnailUrl(filename: string): string {
    if (IS_DEMO_MODE) {
      return this.mockGetThumbnailUrl(filename)
    }
    
    return `${API_BASE_URL}/api/files/${filename}`
  }
  
  // Demo mode methods
  private async mockGenerateThumbnail(request: ThumbnailRequest): Promise<ThumbnailResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    const filename = `${Date.now()}_thumbnail.jpg`
    const mockResponse: ThumbnailResponse = {
      filename,
      width: 1280,
      height: 720,
      size_bytes: Math.floor(Math.random() * 1000000) + 500000, // 0.5-1.5MB
      url: `/api/files/${filename}`
    }
    
    // Store in demo cache
    this.storeDemoThumbnail({
      ...request,
      filename: mockResponse.filename,
      created_at: new Date().toISOString()
    })
    
    return mockResponse
  }
  
  private async mockListThumbnails(limit: number): Promise<ThumbnailListResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const demoThumbnails = this.getDemoThumbnails()
    const limitedThumbnails = demoThumbnails.slice(0, limit)
    
    return {
      thumbnails: limitedThumbnails.map(t => ({
        filename: t.filename,
        size_bytes: Math.floor(Math.random() * 1000000) + 500000,
        created_at: t.created_at
      })),
      total_count: demoThumbnails.length
    }
  }
  
  private mockGetThumbnailUrl(filename: string): string {
    // Return a placeholder image service URL
    const seed = filename.split('_')[0] || '1'
    return `https://picsum.photos/seed/${seed}/1280/720`
  }
  
  // Demo cache management
  private storeDemoThumbnail(thumbnail: any) {
    const key = 'demo_thumbnails'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.unshift(thumbnail) // Add to beginning
    
    // Keep only last 20 thumbnails
    const limited = existing.slice(0, 20)
    localStorage.setItem(key, JSON.stringify(limited))
  }
  
  private getDemoThumbnails(): any[] {
    const key = 'demo_thumbnails'
    return JSON.parse(localStorage.getItem(key) || '[]')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export types for convenience
export type { ThumbnailRequest, ThumbnailResponse, ThumbnailListResponse, HealthResponse }