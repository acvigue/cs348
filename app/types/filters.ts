import type { PaginationQueryParams } from './pagination'

export interface EquipmentFilterParams extends PaginationQueryParams {
  status?: string
  statusFilter?: string
  labId?: number
  lab_id?: number
  search?: string
}

export interface LabFilterParams extends PaginationQueryParams {
  availability?: string
  availabilityFilter?: string
  search?: string
}

export interface ReservationFilterParams extends PaginationQueryParams {
  status?: string
  statusFilter?: string
  search?: string
}
