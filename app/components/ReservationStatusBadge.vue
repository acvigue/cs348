<template>
  <UBadge :color="statusColor" :variant="variant" :size="size">
    {{ statusLabel }}
  </UBadge>
</template>

<script setup lang="ts">
import type { ComputedReservationStatus } from '~/types/reservation'

interface Props {
  status: ComputedReservationStatus
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'subtle',
  size: 'md'
})

const statusColors: Record<
  ComputedReservationStatus,
  'warning' | 'success' | 'error' | 'info' | 'neutral'
> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'info',
  IN_PROGRESS: 'neutral'
}

const statusLabels: Record<ComputedReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress'
}

const statusColor = computed(() => statusColors[props.status])
const statusLabel = computed(() => statusLabels[props.status])
</script>
