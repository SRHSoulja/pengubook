// API-related types and common response interfaces

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  cursor?: string
}

export interface PaginationResponse<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
    nextOffset?: number
    nextCursor?: string
  }
}

export interface SearchParams extends PaginationParams {
  query?: string
  category?: string
  tags?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface UploadResponse {
  success: boolean
  data: {
    url: string
    fileName: string
    fileSize: number
    fileType: string
    uploadType: string
    uploadedBy: string
    uploadedAt: string
  }
}

export interface ErrorResponse {
  error: string
  statusCode: number
  details?: any
}