<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const toast = useToast()
const { user } = await useUser()

const labId = route.params.id as string

// Check permissions
const canManageLabs = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Fetch lab details
const { data: labData, pending, refresh } = await useFetch(`/api/labs/${labId}`)

const lab = computed(() => labData.value?.body)

useHead({
  title: computed(() =>
    lab.value ? `${lab.value.building} ${lab.value.roomNumber} - Lab` : 'Lab Details'
  )
})

// Edit mode
const isEditing = ref(false)

// Zod schema for validation
const schema = z.object({
  building: z.string().min(1, 'Building is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  description: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1')
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive({
  building: '',
  roomNumber: '',
  description: '',
  capacity: 1
})

const loading = ref(false)
const error = ref('')

// Initialize form when lab loads
watch(
  lab,
  (newLab) => {
    if (newLab) {
      state.building = newLab.building
      state.roomNumber = newLab.roomNumber
      state.description = newLab.description || ''
      state.capacity = newLab.capacity
    }
  },
  { immediate: true }
)

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    await $fetch(`/api/labs/${labId}`, {
      method: 'PUT',
      body: {
        building: event.data.building,
        roomNumber: event.data.roomNumber,
        description: event.data.description || undefined,
        capacity: event.data.capacity
      }
    })

    toast.add({
      title: 'Success',
      description: 'Lab updated successfully',
      color: 'success'
    })

    isEditing.value = false
    await refresh()
  } catch (err) {
    error.value = (err as { data?: { message?: string } })?.data?.message || 'Failed to update lab'
  } finally {
    loading.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
  error.value = ''
  // Reset form to current lab values
  if (lab.value) {
    state.building = lab.value.building
    state.roomNumber = lab.value.roomNumber
    state.description = lab.value.description || ''
    state.capacity = lab.value.capacity
  }
}

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

// Equipment stats
const equipmentStats = computed(() => {
  if (!lab.value?.equipment) return { total: 0, available: 0, inUse: 0, maintenance: 0 }

  const stats = {
    total: lab.value.equipment.length,
    available: 0,
    inUse: 0,
    maintenance: 0
  }

  lab.value.equipment.forEach((eq) => {
    if (eq.status === 'AVAILABLE') stats.available++
    else if (eq.status === 'IN_USE') stats.inUse++
    else if (eq.status === 'MAINTENANCE' || eq.status === 'OUT_OF_ORDER') stats.maintenance++
  })

  return stats
})

// Utilization data
const utilizationDays = ref(7)
const utilizationDaysOptions = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 }
]

const selectedUtilizationPeriod = computed({
  get: () =>
    utilizationDaysOptions.find((opt) => opt.value === utilizationDays.value) ||
    utilizationDaysOptions[0],
  set: (val) => {
    if (val) utilizationDays.value = val.value
  }
})

const { data: utilizationData } = await useFetch(`/api/labs/${labId}/utilization`, {
  query: { days: utilizationDays },
  watch: [utilizationDays]
})

const utilizationStartDate = computed(() => utilizationData.value?.body?.startDate)
const utilizationEndDate = computed(() => utilizationData.value?.body?.endDate)

// Transform equipment utilization data into timelines for GANTT chart
const ganttTimelines = computed(() => {
  if (!utilizationData.value?.body?.equipment) return []

  return utilizationData.value.body.equipment.map((eq) => ({
    id: eq.equipmentId,
    label: eq.equipmentName,
    segments: eq.timeline.map((item) => ({
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
      label: item.purpose,
      metadata: {
        'Reservation ID': `#${item.reservationId}`,
        User: item.user.email,
        Status: item.status
      }
    }))
  }))
})

// Status configuration for the GANTT chart
const statusConfig = {
  PENDING: { color: '#f59e0b', label: 'Pending' },
  CONFIRMED: { color: '#3b82f6', label: 'Reserved' },
  IN_PROGRESS: { color: '#eab308', label: 'In Use' },
  COMPLETED: { color: '#6b7280', label: 'Used' },
  CANCELLED: { color: '#ef4444', label: 'Cancelled' }
}

const defaultStatus = { color: '#10b981', label: 'Available' }
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

      <!-- Lab Details -->
      <div v-else-if="lab">
        <UButton variant="ghost" icon="i-heroicons-arrow-left" to="/labs" class="mb-4">
          Back to Labs
        </UButton>
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ lab.building }} {{ lab.roomNumber }}
              </h1>
              <LabAvailabilityBadge :availability="lab.availability" size="lg" />
            </div>
            <p class="text-gray-600 dark:text-gray-400">
              Added {{ new Date(lab.createdAt).toLocaleDateString() }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div v-if="canManageLabs && !isEditing" class="flex gap-2">
            <UButton color="primary" icon="i-heroicons-pencil-square" @click="isEditing = true">
              Edit
            </UButton>
          </div>
        </div>

        <!-- View Mode -->
        <div v-if="!isEditing" class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Lab Information -->
          <div class="lg:col-span-2 space-y-6">
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold">Lab Information</h2>
              </template>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Building
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ lab.building }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Number
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ lab.roomNumber }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ lab.capacity }} people</p>
                </div>

                <div v-if="lab.description">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ lab.description }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Updated
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ formatDateTime(lab.updatedAt) }}</p>
                </div>
              </div>
            </UCard>

            <!-- Equipment List -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold">Equipment in this Lab</h2>
                  <UButton
                    v-if="canManageLabs"
                    size="sm"
                    icon="i-heroicons-plus"
                    to="/equipment/new"
                  >
                    Add Equipment
                  </UButton>
                </div>
              </template>

              <div v-if="lab.equipment && lab.equipment.length > 0" class="space-y-3">
                <div
                  v-for="equipment in lab.equipment"
                  :key="equipment.id"
                  class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  @click="navigateTo(`/equipment/${equipment.id}`)"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-1">
                      <h3 class="font-medium text-gray-900 dark:text-white">
                        {{ equipment.name }}
                      </h3>
                      <EquipmentStatusBadge :status="equipment.status" />
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ equipment.type }} • {{ equipment.serialNumber }}
                    </p>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div v-else class="text-center py-8 text-gray-500">No equipment in this lab yet</div>
            </UCard>

            <!-- Equipment Utilization Chart -->
            <UCard v-if="lab.equipment && lab.equipment.length > 0">
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold">Equipment Utilization</h2>
                  <USelectMenu
                    v-model="selectedUtilizationPeriod"
                    :items="utilizationDaysOptions"
                    value-attribute="value"
                  />
                </div>
              </template>

              <div v-if="ganttTimelines.length > 0 && utilizationStartDate && utilizationEndDate">
                <GanttChart
                  :timelines="ganttTimelines"
                  :start-date="utilizationStartDate"
                  :end-date="utilizationEndDate"
                  :status-config="statusConfig"
                  :default-status="defaultStatus"
                  :bar-height="40"
                />
              </div>
              <div v-else class="text-center py-8">
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="w-12 h-12 text-gray-400 mx-auto mb-2"
                />
                <p class="text-gray-600 dark:text-gray-400">
                  No reservations in the selected time period
                </p>
              </div>
            </UCard>
          </div>

          <!-- Right Column - Stats -->
          <div class="space-y-6">
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold">Statistics</h2>
              </template>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Total Equipment</span>
                  <span class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ equipmentStats.total }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Available</span>
                  <span class="text-2xl font-bold text-green-600">
                    {{ equipmentStats.available }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">In Use</span>
                  <span class="text-2xl font-bold text-blue-600">
                    {{ equipmentStats.inUse }}
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-gray-600 dark:text-gray-400">Maintenance/Offline</span>
                  <span class="text-2xl font-bold text-yellow-600">
                    {{ equipmentStats.maintenance }}
                  </span>
                </div>

                <div
                  class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <span class="text-gray-600 dark:text-gray-400">Capacity</span>
                  <span class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ lab.capacity }}
                  </span>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold">Availability</h2>
              </template>

              <div class="space-y-4">
                <div class="text-center">
                  <LabAvailabilityBadge :availability="lab.availability" size="lg" />
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Current lab status based on equipment availability
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="mt-8">
          <UCard>
            <template #header>
              <h2 class="text-xl font-semibold">Edit Lab</h2>
            </template>

            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
              <UFormGroup label="Building" name="building" required>
                <UInput v-model="state.building" placeholder="e.g., Engineering Building" />
              </UFormGroup>

              <UFormGroup label="Room Number" name="roomNumber" required>
                <UInput v-model="state.roomNumber" placeholder="e.g., 101" />
              </UFormGroup>

              <UFormGroup label="Capacity" name="capacity" required>
                <UInput v-model.number="state.capacity" type="number" min="1" />
              </UFormGroup>

              <UFormGroup label="Description" name="description">
                <UTextarea
                  v-model="state.description"
                  placeholder="Describe the lab and its purpose"
                  :rows="4"
                />
              </UFormGroup>

              <UAlert
                v-if="error"
                color="error"
                variant="subtle"
                :title="error"
                icon="i-heroicons-exclamation-circle"
              />

              <div class="flex gap-2 pt-4">
                <UButton type="submit" :loading="loading"> Save Changes </UButton>
                <UButton variant="outline" @click="cancelEdit"> Cancel </UButton>
              </div>
            </UForm>
          </UCard>
        </div>
      </div>

      <!-- Error State -->
      <UCard v-else>
        <div class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Lab not found</p>
          <UButton variant="ghost" to="/labs" class="mt-4"> Back to Labs </UButton>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
