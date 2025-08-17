/**
 * Gallery Component
 * 
 * Displays a grid of recently generated thumbnails with loading states and pagination
 */

import React, { useState } from 'react'
import { useThumbnailsList, useThumbnailUrl } from '../api/hooks'
import type { ThumbnailResponse, ThumbnailListItem } from '../types'

interface GalleryProps {
  onThumbnailSelect?: (thumbnail: ThumbnailResponse) => void
  disabled?: boolean
}

const Gallery: React.FC<GalleryProps> = ({ onThumbnailSelect, disabled = false }) => {
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null)
  
  // Fetch thumbnails list
  const { 
    data: thumbnailsData, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isFetching 
  } = useThumbnailsList(20, {
    enabled: !disabled
  })
  
  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown'
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch {
      return 'Unknown'
    }
  }
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }
  
  // Handle thumbnail click
  const handleThumbnailClick = (item: ThumbnailListItem) => {
    const thumbnailResponse: ThumbnailResponse = {
      filename: item.filename,
      width: 1280,
      height: 720,
      size_bytes: item.size_bytes,
      url: `/api/files/${item.filename}`
    }
    
    setSelectedThumbnail(item.filename)
    onThumbnailSelect?.(thumbnailResponse)
  }
  
  // Handle download
  const handleDownload = (item: ThumbnailListItem, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const url = useThumbnailUrl(item.filename)
    const link = document.createElement('a')
    link.href = url
    link.download = item.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading thumbnails...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (isError) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.078 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load thumbnails
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'An error occurred while loading the gallery'}
          </p>
          <button
            onClick={() => refetch()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  // Empty state
  if (!thumbnailsData?.thumbnails.length) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No thumbnails yet
          </h3>
          <p className="text-gray-600">
            Generate your first thumbnail to see it appear here.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Thumbnails
          </h2>
          <p className="text-sm text-gray-600">
            {thumbnailsData.total_count} thumbnail{thumbnailsData.total_count !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-outline flex items-center space-x-2"
        >
          <svg 
            className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
      
      {/* Gallery Grid */}
      <div className="gallery-grid">
        {thumbnailsData.thumbnails.map((item) => (
          <ThumbnailCard
            key={item.filename}
            item={item}
            isSelected={selectedThumbnail === item.filename}
            onClick={() => handleThumbnailClick(item)}
            onDownload={(event) => handleDownload(item, event)}
            formatDate={formatDate}
            formatFileSize={formatFileSize}
          />
        ))}
      </div>
    </div>
  )
}

// Separate component for thumbnail cards to optimize rendering
interface ThumbnailCardProps {
  item: ThumbnailListItem
  isSelected: boolean
  onClick: () => void
  onDownload: (event: React.MouseEvent) => void
  formatDate: (dateString?: string) => string
  formatFileSize: (bytes: number) => string
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  item,
  isSelected,
  onClick,
  onDownload,
  formatDate,
  formatFileSize
}) => {
  const thumbnailUrl = useThumbnailUrl(item.filename)
  
  return (
    <div
      className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary-500' : ''
      }`}
      onClick={onClick}
    >
      {/* Thumbnail Image */}
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3 relative group">
        <img
          src={thumbnailUrl}
          alt={item.filename}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={onDownload}
            className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-900 p-2 rounded-full transition-all duration-200"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
        
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Thumbnail Info */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 text-sm truncate">
          {item.filename.replace(/^\d{4}-\d{2}-\d{2}_\d{6}_/, '').replace('.jpg', '')}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatFileSize(item.size_bytes)}</span>
          <span>{formatDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

export default Gallery