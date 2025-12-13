export interface PaginationQueryParams {
  page?: number | string
  results_per_page?: number | string
  cursor?: number | string | null
}

export interface PaginationMeta {
  page: number
  perPage: number
  totalPages: number
  totalResults: number
  nextCursor: number | null
  prevCursor: number | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}
