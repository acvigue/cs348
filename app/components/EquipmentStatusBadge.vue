<template>
  <UBadge :color="statusColor" :variant="variant" :size="size">
    {{ statusLabel }}
  </UBadge>
</template>

<script setup lang="ts">
import type { ComputedEquipmentStatus } from '~/types/equipment'

interface Props {
  status: ComputedEquipmentStatus
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'subtle',
  size: 'md'
})

const statusColors: Record<ComputedEquipmentStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  AVAILABLE: 'success',
  IN_USE: 'neutral',
  OPERATIONAL: 'success',
  MAINTENANCE: 'warning',
  OUT_OF_ORDER: 'error'
}

const statusLabels: Record<ComputedEquipmentStatus, string> = {
  AVAILABLE: 'Available',
  IN_USE: 'In Use',
  OPERATIONAL: 'Operational',
  MAINTENANCE: 'Maintenance',
  OUT_OF_ORDER: 'Out of Order'
}

const statusColor = computed(() => statusColors[props.status])
const statusLabel = computed(() => statusLabels[props.status])
</script>
