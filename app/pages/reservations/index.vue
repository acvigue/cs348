<script setup lang="ts">
import type { ComputedReservationStatus } from '~/types/reservation'

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

// Fetch reservations
const {
  data: reservationsData,
  pending,
  refresh: _refresh
} = await useFetch('/api/reservations', {
  query: {
    page,
    results_per_page: perPage
  },
  watch: [page, perPage]
})

const reservations = computed(() => reservationsData.value?.reservations || [])
const pagination = computed(() => reservationsData.value?.pagination)

// Filter reservations by status
const filteredReservations = computed(() => {
  if (statusFilter.value === 'ALL') return reservations.value
  return reservations.value.filter((r) => r.status === statusFilter.value)
})

const statusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const selectedStatusOption = computed({
  get: () => statusOptions.find((opt) => opt.value === statusFilter.value) || statusOptions[0],
  set: (val) => {
    if (val) statusFilter.value = val.value as ComputedReservationStatus | 'ALL'
  }
})

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
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Reservations</h1>
            <p class="text-gray-600 dark:text-gray-400">
              View and manage your lab equipment reservations
            </p>
          </div>
          <UButton to="/reservations/new" icon="i-heroicons-plus" size="lg">
            New Reservation
          </UButton>
        </div>
      </div>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <USelectMenu v-model="selectedStatusOption" :items="statusOptions" />
          </div>
        </div>
      </UCard>

      <!-- Reservations List -->
      <UCard v-if="pending">
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
        </div>
      </UCard>

      <UCard v-else-if="filteredReservations.length === 0">
        <div class="text-center py-12">
          <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No reservations found
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{
              statusFilter === 'ALL'
                ? "You haven't made any reservations yet."
                : `No ${statusFilter.toLowerCase()} reservations.`
            }}
          </p>
          <UButton to="/reservations/new" icon="i-heroicons-plus">Create Reservation</UButton>
        </div>
      </UCard>

      <div v-else class="space-y-4">
        <UCard
          v-for="reservation in filteredReservations"
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
                <div class="flex items-start gap-2">
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="w-5 h-5 text-gray-400 mt-0.5"
                  />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Lab</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ getLabNames(reservation) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon name="i-heroicons-beaker" class="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Equipment</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ getEquipmentNames(reservation) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon name="i-heroicons-cube" class="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Items</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ getEquipmentCount(reservation) }} item{{
                        getEquipmentCount(reservation) !== 1 ? 's' : ''
                      }}
                    </p>
                  </div>
                </div>
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
      <div v-if="pagination && pagination.total_pages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model:page="page"
          :items-per-page="perPage"
          :total="pagination.total_results"
        />
      </div>
    </UContainer>
  </div>
</template>
