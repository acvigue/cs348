<script setup lang="ts">
import type { ComputedReservationStatus } from '~/types/reservation'
import type { PaginationMeta } from '~/types/pagination'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'My Reservations - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'View and manage your lab equipment reservations'
    }
  ]
})

const { user: _user } = await useUser()

// Pagination and filtering
const page = ref(1)
const perPage = ref(20)
const statusFilter = ref<ComputedReservationStatus | 'ALL'>('ALL')

const statusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const reservationsQuery = computed(() => ({
  page: page.value,
  results_per_page: perPage.value,
  status: statusFilter.value !== 'ALL' ? statusFilter.value : undefined
}))

// Fetch reservations
const {
  data: reservationsData,
  pending,
  refresh: _refresh
} = await useFetch('/api/reservations', {
  query: reservationsQuery,
  watch: [reservationsQuery]
})

const reservations = computed(() => reservationsData.value?.reservations || [])
const pagination = computed<PaginationMeta | undefined>(() => reservationsData.value?.pagination)

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getEquipmentNames = (reservation: { equipment?: Array<{ equipment: { name: string } }> }) => {
  if (!reservation.equipment || reservation.equipment.length === 0) return 'No equipment'
  return reservation.equipment.map((e) => e.equipment.name).join(', ')
}

const getEquipmentCount = (reservation: { equipment?: Array<unknown> }) => {
  if (!reservation.equipment || reservation.equipment.length === 0) return 0
  return reservation.equipment.length
}

const getLabNames = (reservation: {
  equipment?: Array<{ equipment: { lab: { building: string; roomNumber: string } } }>
}) => {
  if (!reservation.equipment || reservation.equipment.length === 0) return 'No lab'
  // Get unique labs
  const labs = new Set<string>()
  reservation.equipment.forEach((e) => {
    if (e.equipment.lab) {
      labs.add(`${e.equipment.lab.building} ${e.equipment.lab.roomNumber}`)
    }
  })
  return Array.from(labs).join(', ')
}
</script>

<template>
  <div>
    <UContainer class="py-8">
      <PageHeader
        title="My Reservations"
        description="View and manage your lab equipment reservations"
      >
        <template #actions>
          <UButton to="/reservations/new" icon="i-heroicons-plus" size="lg">
            New Reservation
          </UButton>
        </template>
      </PageHeader>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <USelectMenu v-model="statusFilter" :items="statusOptions" value-key="value" />
          </div>
        </div>
      </UCard>

      <!-- Reservations List -->
      <LoadingSpinner v-if="pending" />

      <EmptyState
        v-else-if="reservations.length === 0"
        icon="i-heroicons-calendar-days"
        title="No reservations found"
        :description="
          statusFilter === 'ALL'
            ? 'You haven\'t made any reservations yet.'
            : `No ${statusFilter.toLowerCase()} reservations.`
        "
      >
        <template #action>
          <UButton to="/reservations/new" icon="i-heroicons-plus">Create Reservation</UButton>
        </template>
      </EmptyState>

      <div v-else class="space-y-4">
        <UCard
          v-for="reservation in reservations"
          :key="reservation.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="navigateTo(`/reservations/${reservation.id}`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-3">
                <ReservationStatusBadge :status="reservation.status" size="lg" />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  ID: #{{ reservation.id }}
                </span>
              </div>

              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {{ reservation.purpose }}
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <InfoRow icon="i-heroicons-building-office-2" label="Lab">
                  {{ getLabNames(reservation) }}
                </InfoRow>
                <InfoRow icon="i-heroicons-beaker" label="Equipment">
                  {{ getEquipmentNames(reservation) }}
                </InfoRow>
                <InfoRow icon="i-heroicons-cube" label="Items">
                  {{ getEquipmentCount(reservation) }} item{{
                    getEquipmentCount(reservation) !== 1 ? 's' : ''
                  }}
                </InfoRow>
              </div>

              <div class="flex items-center gap-6 text-sm">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ formatDateTime(reservation.startTime) }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ formatDateTime(reservation.endTime) }}
                  </span>
                </div>
              </div>
            </div>

            <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
          </div>
        </UCard>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model:page="page"
          :items-per-page="pagination?.perPage ?? perPage"
          :total="pagination.totalResults"
        />
      </div>
    </UContainer>
  </div>
</template>
