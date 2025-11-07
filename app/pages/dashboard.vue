<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = await useUser()
const toast = useToast()

useHead({
  title: 'Dashboard - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Manage your lab equipment reservations and view analytics'
    }
  ]
})

const isInstructorOrAdmin = computed(() => {
  return user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
})

// Fetch labs with real data
const { data: labsData } = await useFetch('/api/labs')
const labs = computed(() => labsData.value?.labs || [])

// Fetch equipment stats
const { data: equipmentData } = await useFetch('/api/equipment')
const totalEquipment = computed(() => equipmentData.value?.pagination?.total_results || 0)
const availableNow = computed(() => {
  return equipmentData.value?.equipment?.filter((e) => e.status === 'AVAILABLE').length || 0
})

// Fetch reservations
const { data: reservationsData, refresh: refreshReservations } = await useFetch(
  '/api/reservations',
  {
    query: { results_per_page: isInstructorOrAdmin.value ? 10 : 5 }
  }
)

const reservations = computed(() => {
  const allReservations = reservationsData.value?.reservations || []
  // For regular users, show only their own reservations
  if (!isInstructorOrAdmin.value && user.value?.body?.id) {
    return allReservations.filter((r) => r.userId === user.value!.body.id)
  }
  // For instructors/admins, show all reservations
  return allReservations
})

// Calculate stats
const activeReservations = computed(() => {
  return reservations.value.filter((r) => r.status === 'IN_PROGRESS').length
})

const upcomingReservations = computed(() => {
  return reservations.value.filter((r) => r.status === 'CONFIRMED').length
})

const canConfirmReservation = (reservation: { status: string; endTime: string }) => {
  if (!isInstructorOrAdmin.value) return false
  const isPast = new Date() > new Date(reservation.endTime)
  return reservation.status === 'PENDING' && !isPast
}

const canCancelReservation = (reservation: { status: string; endTime: string; userId: number }) => {
  const isPast = new Date() > new Date(reservation.endTime)
  const isCancellable = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(reservation.status)

  if (isInstructorOrAdmin.value) {
    return !isPast && isCancellable
  }

  // Regular users can only cancel their own non-approved reservations
  return !isPast && reservation.status === 'PENDING' && reservation.userId === user.value?.body?.id
}

const confirmLoading = ref<Record<number, boolean>>({})
const cancelLoading = ref<Record<number, boolean>>({})

const confirmReservation = async (reservationId: number) => {
  confirmLoading.value[reservationId] = true
  try {
    await $fetch(`/api/reservations/${reservationId}/confirm`, {
      method: 'PUT'
    })
    toast.add({
      title: 'Success',
      description: 'Reservation confirmed',
      color: 'success'
    })
    await refreshReservations()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: (error as any).data?.message || 'Failed to confirm reservation',
      color: 'error'
    })
  } finally {
    confirmLoading.value[reservationId] = false
  }
}

const cancelReservation = async (reservationId: number) => {
  cancelLoading.value[reservationId] = true
  try {
    await $fetch(`/api/reservations/${reservationId}/cancel`, {
      method: 'PUT'
    })
    toast.add({
      title: 'Success',
      description: 'Reservation cancelled',
      color: 'success'
    })
    await refreshReservations()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: (error as any).data?.message || 'Failed to cancel reservation',
      color: 'error'
    })
  } finally {
    cancelLoading.value[reservationId] = false
  }
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getLabBgClass = (availability: string) => {
  switch (availability) {
    case 'EMPTY':
      return 'bg-green-50 dark:bg-green-900/20'
    case 'IN_USE':
      return 'bg-yellow-50 dark:bg-yellow-900/20'
    case 'FULL':
      return 'bg-red-50 dark:bg-red-900/20'
    default:
      return 'bg-gray-50 dark:bg-gray-900/20'
  }
}
</script>

<template>
  <div>
    <UContainer class="py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {{ user?.body?.email?.split('@')[0] || 'User' }}!
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage your lab equipment reservations and track utilization.
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <UCard>
          <div class="flex items-center">
            <div
              class="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4"
            >
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ activeReservations }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Active Now</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center">
            <div
              class="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mr-4"
            >
              <UIcon
                name="i-heroicons-calendar-days"
                class="w-6 h-6 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ upcomingReservations }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center">
            <div
              class="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mr-4"
            >
              <UIcon
                name="i-heroicons-beaker"
                class="w-6 h-6 text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ totalEquipment }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Total Equipment</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center">
            <div
              class="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg mr-4"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-6 h-6 text-yellow-600 dark:text-yellow-400"
              />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ availableNow }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Available Now</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Main Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UButton
              size="lg"
              icon="i-heroicons-plus"
              block
              to="/reservations/new"
              class="justify-center"
            >
              New Reservation
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-magnifying-glass"
              block
              to="/equipment"
              class="justify-center"
            >
              Browse Equipment
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-calendar-days"
              block
              to="/reservations"
              class="justify-center"
            >
              My Reservations
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-beaker"
              block
              to="/labs"
              class="justify-center"
            >
              Browse Labs
            </UButton>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Lab Status</h2>
          </template>

          <div class="space-y-3 max-h-[280px] overflow-y-auto">
            <div
              v-for="lab in labs"
              :key="lab.id"
              class="flex items-center justify-between p-3 rounded-lg"
              :class="getLabBgClass(lab.availability)"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ lab.building }} {{ lab.roomNumber }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {{ lab.description || 'No description' }}
                </p>
              </div>
              <LabAvailabilityBadge :availability="lab.availability" />
            </div>
            <p v-if="labs.length === 0" class="text-sm text-gray-500 text-center py-4">
              No labs available
            </p>
          </div>
        </UCard>
      </div>

      <!-- Recent Reservations -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ isInstructorOrAdmin ? 'Recent Reservations' : 'My Recent Reservations' }}
            </h2>
            <UButton variant="ghost" to="/reservations" icon="i-heroicons-arrow-right">
              View All
            </UButton>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Purpose
                </th>
                <th
                  v-if="isInstructorOrAdmin"
                  class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                >
                  User
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Time</th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Status
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="reservation in reservations"
                :key="reservation.id"
                class="border-b border-gray-100 dark:border-gray-800"
              >
                <td class="py-3 px-4 text-gray-900 dark:text-white font-medium max-w-xs truncate">
                  {{ reservation.purpose }}
                </td>
                <td v-if="isInstructorOrAdmin" class="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {{ reservation.user.email }}
                </td>
                <td class="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {{ formatDateTime(reservation.startTime) }}
                </td>
                <td class="py-3 px-4">
                  <ReservationStatusBadge :status="reservation.status" />
                </td>
                <td class="py-3 px-4">
                  <div class="flex gap-2">
                    <UButton
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-eye"
                      :to="`/reservations/${reservation.id}`"
                    >
                      View
                    </UButton>
                    <UButton
                      v-if="canConfirmReservation(reservation)"
                      variant="ghost"
                      size="sm"
                      color="success"
                      icon="i-heroicons-check"
                      :loading="confirmLoading[reservation.id]"
                      @click="confirmReservation(reservation.id)"
                    >
                      Confirm
                    </UButton>
                    <UButton
                      v-if="canCancelReservation(reservation)"
                      variant="ghost"
                      size="sm"
                      color="error"
                      icon="i-heroicons-x-mark"
                      :loading="cancelLoading[reservation.id]"
                      @click="cancelReservation(reservation.id)"
                    >
                      Cancel
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="reservations.length === 0" class="text-center py-8 text-gray-500">
            No reservations found
          </p>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
