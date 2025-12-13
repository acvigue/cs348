import type { PaginationMeta, PaginationQueryParams } from '~/types/pagination'

const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100

export interface ParsedPagination {
  page: number
  perPage: number
  cursor: number | null
}

function toPositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback
  }
  return value
}

export function parsePaginationQuery(query: PaginationQueryParams): ParsedPagination {
  const rawPage = Number(query.page ?? 1)
  const rawPerPage = Number(query.results_per_page ?? DEFAULT_PER_PAGE)
  const page = toPositiveInteger(Math.trunc(rawPage), 1)
  const perPage = Math.min(
    toPositiveInteger(Math.trunc(rawPerPage), DEFAULT_PER_PAGE),
    MAX_PER_PAGE
  )
  const cursor = query.cursor !== undefined && query.cursor !== null ? Number(query.cursor) : null

  return {
    page,
    perPage,
    cursor: Number.isFinite(cursor) ? cursor : null
  }
}

interface PaginationMetaArgs {
  page: number
  perPage: number
  totalResults: number
  nextCursor: number | null
  prevCursor: number | null
}

export function buildPaginationMeta({
  page,
  perPage,
  totalResults,
  nextCursor,
  prevCursor
}: PaginationMetaArgs): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalResults / perPage))

  return {
    page,
    perPage,
    totalPages,
    totalResults,
    nextCursor,
    prevCursor
  }
}
