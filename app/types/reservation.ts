import type { ReservationStatus } from '~/generated/prisma/enums'

/**
 * Merged reservation status including database status (PENDING, CONFIRMED, CANCELLED)
 * and computed time-based status (IN_PROGRESS, COMPLETED)
 *
 * Note: In API responses, this is returned as the "status" field (not "computedStatus")
 */
export type ComputedReservationStatus = ReservationStatus | 'IN_PROGRESS' | 'COMPLETED'
