/**
 * TanStack Query Hooks for YouTube Thumbnail Generator
 * 
 * Custom hooks that provide type-safe API interactions with
 * caching, background refetching, and error handling.
 */

import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import type { 
  ThumbnailRequest, 
  ThumbnailResponse, 
  ThumbnailListResponse, 
  HealthResponse,
  ApiError 
} from '../types'

// Query Keys - centralized for consistency
export const queryKeys = {
  health: ['health'] as const,
  thumbnails: ['thumbnails'] as const,
  thumbnailsList: (limit?: number) => ['thumbnails', 'list', limit] as const,
}

// Health Check Query
export function useHealthCheck(options?: UseQueryOptions<HealthResponse, ApiError>) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.healthCheck(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
    retry: 3,
    ...options,
  })
}

// Thumbnails List Query
export function useThumbnailsList(
  limit = 20,
  options?: UseQueryOptions<ThumbnailListResponse, ApiError>
) {
  return useQuery({
    queryKey: queryKeys.thumbnailsList(limit),
    queryFn: () => apiClient.listThumbnails(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    ...options,
  })
}

// Generate Thumbnail Mutation
export function useGenerateThumbnail() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: ThumbnailRequest) => apiClient.generateThumbnail(request),
    onSuccess: (data: ThumbnailResponse) => {
      // Invalidate thumbnails list to show the new thumbnail
      queryClient.invalidateQueries({ queryKey: queryKeys.thumbnails })
      
      // Optionally add the new thumbnail to the cache optimistically
      queryClient.setQueryData<ThumbnailListResponse>(
        queryKeys.thumbnailsList(),
        (old) => {
          if (!old) return undefined
          
          const newThumbnail = {
            filename: data.filename,
            size_bytes: data.size_bytes,
            created_at: new Date().toISOString(),
          }
          
          return {
            thumbnails: [newThumbnail, ...old.thumbnails],
            total_count: old.total_count + 1,
          }
        }
      )
    },
    onError: (error: ApiError) => {
      console.error('Thumbnail generation failed:', error)
    },
  })
}

// Custom hook for getting thumbnail URL
export function useThumbnailUrl(filename: string): string {
  return apiClient.getThumbnailUrl(filename)
}

// Custom hook for managing form state with optimistic updates
export function useOptimisticThumbnail() {
  const generateMutation = useGenerateThumbnail()
  
  const generateWithProgress = async (
    request: ThumbnailRequest,
    onProgress?: (progress: number, stage: string) => void
  ) => {
    try {
      // Simulate progress updates for better UX
      onProgress?.(10, 'Validating input...')
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500))
      onProgress?.(25, 'Generating AI background...')
      
      // Start the actual generation
      const result = generateMutation.mutateAsync(request)
      
      // Continue progress simulation
      setTimeout(() => onProgress?.(60, 'Composing thumbnail...'), 1000)
      setTimeout(() => onProgress?.(85, 'Optimizing image...'), 2000)
      
      const finalResult = await result
      onProgress?.(100, 'Complete!')
      
      return finalResult
    } catch (error) {
      onProgress?.(0, 'Error occurred')
      throw error
    }
  }
  
  return {
    ...generateMutation,
    generateWithProgress,
  }
}

// Hook for prefetching thumbnails list
export function usePrefetchThumbnails() {
  const queryClient = useQueryClient()
  
  const prefetchThumbnails = (limit = 20) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.thumbnailsList(limit),
      queryFn: () => apiClient.listThumbnails(limit),
      staleTime: 2 * 60 * 1000,
    })
  }
  
  return { prefetchThumbnails }
}

// Hook for real-time connection status
export function useConnectionStatus() {
  const healthQuery = useHealthCheck({
    refetchInterval: 10 * 1000, // Check every 10 seconds
    retry: false, // Don't retry failed health checks
  })
  
  const isConnected = healthQuery.isSuccess
  const isConnecting = healthQuery.isFetching && !healthQuery.data
  const connectionError = healthQuery.error
  
  return {
    isConnected,
    isConnecting,
    connectionError,
    serverInfo: healthQuery.data,
  }
}