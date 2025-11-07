import type { ReservationStatus } from '~/generated/prisma/enums'

/**
 * Computed reservation status including database status and time-based status
 */
export type ComputedReservationStatus = ReservationStatus | 'IN_PROGRESS' | 'COMPLETED'
