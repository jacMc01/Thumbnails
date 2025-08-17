/**
 * Preview Component
 * 
 * Displays the generated thumbnail with download options and metadata
 */

import React from 'react'
import { useThumbnailUrl } from '../api/hooks'
import type { ThumbnailResponse } from '../types'

interface PreviewProps {
  thumbnail: ThumbnailResponse | null
}

const Preview: React.FC<PreviewProps> = ({ thumbnail }) => {
  const thumbnailUrl = thumbnail ? useThumbnailUrl(thumbnail.filename) : null
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }
  
  // Handle download
  const handleDownload = () => {
    if (!thumbnail || !thumbnailUrl) return
    
    const link = document.createElement('a')
    link.href = thumbnailUrl
    link.download = thumbnail.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Handle copy URL
  const handleCopyUrl = async () => {
    if (!thumbnailUrl) return
    
    try {
      await navigator.clipboard.writeText(thumbnailUrl)
      // Could add a toast notification here
      console.log('URL copied to clipboard')
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }
  
  if (!thumbnail) {
    return (
      <div className="card">
        <div className="thumbnail-preview">
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No thumbnail generated yet</p>
            <p className="text-sm text-center">
              Fill out the form and click "Generate Thumbnail" to see your creation here.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="card">
      {/* Thumbnail Preview */}
      <div className="thumbnail-preview has-image mb-6">
        <img
          src={thumbnailUrl || ''}
          alt={`Thumbnail: ${thumbnail.filename}`}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
            
            <button
              onClick={handleCopyUrl}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy URL</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Thumbnail Metadata */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Thumbnail Details
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Dimensions:</span>
            <p className="font-medium text-gray-900">
              {thumbnail.width} × {thumbnail.height}
            </p>
          </div>
          
          <div>
            <span className="text-gray-500">File Size:</span>
            <p className="font-medium text-gray-900">
              {formatFileSize(thumbnail.size_bytes)}
            </p>
          </div>
          
          <div className="col-span-2">
            <span className="text-gray-500">Filename:</span>
            <p className="font-medium text-gray-900 truncate">
              {thumbnail.filename}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleDownload}
            className="btn-primary flex-1"
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </span>
          </button>
          
          <button
            onClick={handleCopyUrl}
            className="btn-outline flex-1"
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy URL</span>
            </span>
          </button>
        </div>
        
        {/* Quality Indicators */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Quality Indicators:</span>
            <div className="flex space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">16:9 Ratio</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${thumbnail.size_bytes <= 2000000 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-gray-600">Size OK</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">YouTube Ready</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Preview