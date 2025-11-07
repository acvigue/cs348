<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = await useUser()

useHead({
  title: 'Dashboard - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Manage your lab equipment reservations and view analytics'
    }
  ]
})

// Sample data - in a real app, this would come from your API
const recentReservations = ref([
  {
    id: 1,
    equipment: 'Oscilloscope OSC-001',
    startTime: '2024-11-07 10:00',
    endTime: '2024-11-07 12:00',
    status: 'CONFIRMED',
    lab: 'Electronics Lab A'
  },
  {
    id: 2,
    equipment: 'Spectrum Analyzer SA-205',
    startTime: '2024-11-08 14:00',
    endTime: '2024-11-08 16:00',
    status: 'PENDING',
    lab: 'RF Lab B'
  }
])

const quickStats = ref({
  activeReservations: 3,
  upcomingReservations: 5,
  totalEquipment: 45,
  availableNow: 32
})

const statusColors: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'info'
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
                {{ quickStats.activeReservations }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Active Reservations</p>
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
                {{ quickStats.upcomingReservations }}
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
                {{ quickStats.totalEquipment }}
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
                {{ quickStats.availableNow }}
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
              icon="i-heroicons-chart-bar"
              block
              to="/reports"
              class="justify-center"
            >
              View Reports
            </UButton>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Lab Status</h2>
          </template>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Electronics Lab A</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Building 2, Room 101</p>
              </div>
              <UBadge color="success" variant="subtle">Available</UBadge>
            </div>

            <div
              class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">RF Lab B</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Building 2, Room 201</p>
              </div>
              <UBadge color="warning" variant="subtle">Busy</UBadge>
            </div>

            <div
              class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Materials Lab C</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Building 3, Room 105</p>
              </div>
              <UBadge color="success" variant="subtle">Available</UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Recent Reservations -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Recent Reservations</h2>
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
                  Equipment
                </th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Lab</th>
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
                v-for="reservation in recentReservations"
                :key="reservation.id"
                class="border-b border-gray-100 dark:border-gray-800"
              >
                <td class="py-3 px-4 text-gray-900 dark:text-white font-medium">
                  {{ reservation.equipment }}
                </td>
                <td class="py-3 px-4 text-gray-600 dark:text-gray-400">{{ reservation.lab }}</td>
                <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {{ reservation.startTime }} - {{ reservation.endTime.split(' ')[1] }}
                </td>
                <td class="py-3 px-4">
                  <UBadge :color="statusColors[reservation.status]" variant="subtle">
                    {{ reservation.status }}
                  </UBadge>
                </td>
                <td class="py-3 px-4">
                  <UButton
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-pencil"
                    :to="`/reservations/${reservation.id}/edit`"
                  >
                    Edit
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
