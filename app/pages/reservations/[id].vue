<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const toast = useToast()
const { user } = await useUser()

const reservationId = route.params.id as string

// Fetch reservation details
const {
  data: reservationData,
  pending,
  refresh
} = await useFetch(`/api/reservations/${reservationId}`)

const reservation = computed(() => reservationData.value?.reservation)

useHead({
  title: computed(() =>
    reservation.value
      ? `Reservation #${reservation.value.id} - ${reservation.value.purpose}`
      : 'Reservation Details'
  )
})

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const canCancel = computed(() => {
  if (!reservation.value || !user.value?.body) return false
  const res = reservation.value
  const currentUser = user.value.body
  const isOwner = res.userId === currentUser.id
  const isInstructor = currentUser.role === 'INSTRUCTOR' && res.userId !== currentUser.id
  const isAdmin = currentUser.role === 'ADMIN'
  const isPast = new Date() > new Date(res.endTime)
  const isCancellable = ['PENDING', 'CONFIRMED'].includes(res.status)

  return !isPast && isCancellable && (isOwner || isInstructor || isAdmin)
})

const canConfirm = computed(() => {
  if (!reservation.value || !user.value?.body) return false
  const res = reservation.value
  const currentUser = user.value.body
  const isInstructor = currentUser.role === 'INSTRUCTOR' && res.userId !== currentUser.id
  const isAdmin = currentUser.role === 'ADMIN'
  const isPast = new Date() > new Date(res.endTime)
  const isPending = res.status === 'PENDING'

  return !isPast && isPending && (isInstructor || isAdmin)
})

const cancelLoading = ref(false)
const confirmLoading = ref(false)

const cancelReservation = async () => {
  cancelLoading.value = true
  try {
    await $fetch(`/api/reservations/${reservationId}/cancel`, {
      method: 'PUT'
    })
    toast.add({
      title: 'Success',
      description: 'Reservation cancelled successfully',
      color: 'success'
    })
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Error',
      description:
        (err as { data?: { message?: string } })?.data?.message || 'Failed to cancel reservation',
      color: 'error'
    })
  } finally {
    cancelLoading.value = false
  }
}

const confirmReservation = async () => {
  confirmLoading.value = true
  try {
    await $fetch(`/api/reservations/${reservationId}/confirm`, {
      method: 'PUT'
    })
    toast.add({
      title: 'Success',
      description: 'Reservation confirmed successfully',
      color: 'success'
    })
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Error',
      description:
        (err as { data?: { message?: string } })?.data?.message || 'Failed to confirm reservation',
      color: 'error'
    })
  } finally {
    confirmLoading.value = false
  }
}

const getLabInfo = (reservation: { equipment?: Array<{ equipment: { lab?: unknown } }> }) => {
  if (!reservation?.equipment || reservation.equipment.length === 0) return null
  const equipment = reservation.equipment[0]?.equipment
  if (!equipment?.lab) return null
  return equipment.lab as {
    building: string
    roomNumber: string
    description?: string | null
    capacity: number
  }
}

const labInfo = computed(() => (reservation.value ? getLabInfo(reservation.value) : null))
</script>

<template>
  <div>
    <UContainer class="py-8">
      <!-- Loading State -->
      <UCard v-if="pending">
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
        </div>
      </UCard>

      <!-- Error State -->
      <UCard v-else-if="!reservation">
        <div class="text-center py-12">
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="w-12 h-12 text-red-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Reservation not found
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            The reservation you're looking for doesn't exist or you don't have permission to view
            it.
          </p>
          <UButton to="/reservations" icon="i-heroicons-arrow-left">Back to Reservations</UButton>
        </div>
      </UCard>

      <!-- Reservation Details -->
      <div v-else>
        <!-- Header with Back Button -->
        <div class="mb-6">
          <UButton to="/reservations" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
            Back to Reservations
          </UButton>
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  Reservation #{{ reservation.id }}
                </h1>
                <ReservationStatusBadge :status="reservation.computedStatus" size="lg" />
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                Created {{ new Date(reservation.createdAt).toLocaleDateString() }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2">
              <UButton
                v-if="canConfirm"
                color="success"
                icon="i-heroicons-check-circle"
                :loading="confirmLoading"
                @click="confirmReservation"
              >
                Confirm
              </UButton>
              <UButton
                v-if="canCancel"
                color="error"
                variant="outline"
                icon="i-heroicons-x-circle"
                :loading="cancelLoading"
                @click="cancelReservation"
              >
                Cancel Reservation
              </UButton>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Main Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Purpose & Notes -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Details</h2>
              </template>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Purpose
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ reservation.purpose }}</p>
                </div>

                <div v-if="reservation.notes">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <p class="text-gray-600 dark:text-gray-400">{{ reservation.notes }}</p>
                </div>
              </div>
            </UCard>

            <!-- Equipment List -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Equipment</h2>
              </template>

              <div class="space-y-3">
                <div
                  v-for="item in reservation.equipment"
                  :key="item.equipmentId"
                  class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <UIcon name="i-heroicons-beaker" class="w-8 h-8 text-primary" />
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ item.equipment.name }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ item.equipment.type }} • {{ item.equipment.serialNumber }}
                    </p>
                  </div>
                  <EquipmentStatusBadge :status="item.equipment.computedStatus" />
                </div>
              </div>
            </UCard>
          </div>

          <!-- Right Column - Time & User Info -->
          <div class="space-y-6">
            <!-- Time Information -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Schedule</h2>
              </template>

              <div class="space-y-4">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Time
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ formatDateTime(reservation.startTime) }}
                  </p>
                </div>

                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Time
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ formatDateTime(reservation.endTime) }}
                  </p>
                </div>

                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Duration
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ getDuration(reservation.startTime, reservation.endTime) }}
                  </p>
                </div>
              </div>
            </UCard>

            <!-- Lab Information -->
            <UCard v-if="labInfo">
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Lab</h2>
              </template>

              <div class="space-y-3">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Location
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ labInfo.building }} {{ labInfo.roomNumber }}
                  </p>
                </div>

                <div v-if="labInfo.description">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ labInfo.description }}
                  </p>
                </div>

                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-users" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Capacity
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">{{ labInfo.capacity }} people</p>
                </div>
              </div>
            </UCard>

            <!-- User Information -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Reserved By</h2>
              </template>

              <div class="space-y-3">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-user" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ reservation.user.email }}
                  </p>
                </div>

                <div v-if="reservation.user.name">
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-identification" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ reservation.user.name }}
                  </p>
                </div>

                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                  </div>
                  <UBadge variant="subtle" class="ml-7">
                    {{ reservation.user.role }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
