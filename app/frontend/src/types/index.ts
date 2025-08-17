/**
 * TypeScript type definitions for the YouTube Thumbnail Generator
 * 
 * These types match the Pydantic models from the backend to ensure
 * type safety across the full stack.
 */

export interface ThumbnailRequest {
  title: string
  topic: string
  accent_color?: string
  logo?: File
}

export interface ThumbnailResponse {
  filename: string
  width: number
  height: number
  size_bytes: number
  url: string
}

export interface ThumbnailListItem {
  filename: string
  size_bytes: number
  created_at?: string
}

export interface ThumbnailListResponse {
  thumbnails: ThumbnailListItem[]
  total_count: number
}

export interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, any>
}

export interface HealthResponse {
  status: string
  version: string
  environment: string
  data_dir_exists: boolean
}

// Form validation types
export interface FormErrors {
  title?: string
  topic?: string
  accent_color?: string
  logo?: string
}

// API client types
export interface ApiError extends Error {
  status?: number
  response?: ErrorResponse
}

// Demo mode types
export interface DemoThumbnail {
  id: string
  title: string
  topic: string
  accent_color: string
  preview_url: string
  created_at: string
}

// UI state types
export interface GenerationState {
  isLoading: boolean
  progress: number
  stage: 'idle' | 'generating' | 'composing' | 'optimizing' | 'complete' | 'error'
  error?: string
}