<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { EquipmentStatus } from '~/generated/prisma/enums'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const toast = useToast()
const { user } = await useUser()

const equipmentId = route.params.id as string

// Check permissions
const canManageEquipment = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Fetch equipment details
const { data: equipmentData, pending, refresh } = await useFetch(`/api/equipment/${equipmentId}`)

const equipment = computed(() => equipmentData.value?.body)

useHead({
  title: computed(() =>
    equipment.value ? `${equipment.value.name} - Equipment` : 'Equipment Details'
  )
})

// Fetch labs for editing
const { data: labsData } = await useFetch('/api/labs', {
  query: { results_per_page: 100 }
})

const labs = computed(() => labsData.value?.labs || [])

// Edit mode
const isEditing = ref(false)

// Zod schema for validation
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  description: z.string().optional(),
  labId: z.number({ message: 'Lab is required' }),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER'])
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive({
  name: '',
  type: '',
  serialNumber: '',
  description: '',
  labId: 0,
  status: 'OPERATIONAL' as EquipmentStatus
})

const loading = ref(false)
const error = ref('')

// Lab options for select
const labOptions = computed(() =>
  labs.value.map((lab) => ({
    id: lab.id,
    label: `${lab.building} ${lab.roomNumber}`,
    description: lab.description ?? undefined
  }))
)

const selectedLab = ref<{ id: number; label: string; description: string | undefined } | undefined>(
  undefined
)

// Initialize form when equipment loads
watch(
  equipment,
  (newEquipment) => {
    if (newEquipment) {
      state.name = newEquipment.name
      state.type = newEquipment.type
      state.serialNumber = newEquipment.serialNumber
      state.description = newEquipment.description || ''
      state.labId = newEquipment.labId
      state.status = newEquipment.dbStatus
      if (newEquipment.lab) {
        selectedLab.value = {
          id: newEquipment.lab.id,
          label: `${newEquipment.lab.building} ${newEquipment.lab.roomNumber}`,
          description: newEquipment.lab.description ?? undefined
        }
      }
    }
  },
  { immediate: true }
)

// Watch lab selection
watch(selectedLab, (newLab) => {
  if (newLab) {
    state.labId = newLab.id
  }
})

// Status options
const statusOptions = [
  { label: 'Operational', value: 'OPERATIONAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Out of Order', value: 'OUT_OF_ORDER' }
]

const selectedStatus = computed({
  get: () => statusOptions.find((opt) => opt.value === state.status) || statusOptions[0],
  set: (val) => {
    if (val) state.status = val.value as EquipmentStatus
  }
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    await $fetch(`/api/equipment/${equipmentId}`, {
      method: 'PUT',
      body: {
        name: event.data.name,
        type: event.data.type,
        serialNumber: event.data.serialNumber,
        description: event.data.description || undefined,
        labId: event.data.labId,
        status: event.data.status
      }
    })

    toast.add({
      title: 'Success',
      description: 'Equipment updated successfully',
      color: 'success'
    })

    isEditing.value = false
    await refresh()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message || 'Failed to update equipment'
  } finally {
    loading.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
  error.value = ''
  // Reset form to current equipment values
  if (equipment.value) {
    state.name = equipment.value.name
    state.type = equipment.value.type
    state.serialNumber = equipment.value.serialNumber
    state.description = equipment.value.description || ''
    state.labId = equipment.value.labId
    state.status = equipment.value.dbStatus
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

// Active reservations
const activeReservations = computed(() => {
  if (!equipment.value?.reservationLinks) return []
  return equipment.value.reservationLinks.filter((link) => {
    const status = link.reservation.status
    const endTime = new Date(link.reservation.endTime)
    return ['CONFIRMED', 'IN_PROGRESS', 'PENDING'].includes(status) && endTime > new Date()
  })
})
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
      <UCard v-else-if="!equipment">
        <div class="text-center py-12">
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="w-12 h-12 text-red-400 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Equipment not found
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            The equipment you're looking for doesn't exist.
          </p>
          <UButton to="/equipment" icon="i-heroicons-arrow-left">Back to Equipment</UButton>
        </div>
      </UCard>

      <!-- Equipment Details -->
      <div v-else>
        <!-- Header with Back Button -->
        <div class="mb-6">
          <UButton to="/equipment" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
            Back to Equipment
          </UButton>
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ equipment.name }}
                </h1>
                <EquipmentStatusBadge :status="equipment.status" size="lg" />
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                Added {{ new Date(equipment.createdAt).toLocaleDateString() }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div v-if="canManageEquipment && !isEditing" class="flex gap-2">
              <UButton color="primary" icon="i-heroicons-pencil-square" @click="isEditing = true">
                Edit
              </UButton>
            </div>
          </div>
        </div>

        <!-- Edit Form -->
        <UCard v-if="isEditing && canManageEquipment" class="mb-6">
          <template #header>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Edit Equipment</h2>
          </template>

          <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
            <!-- Name -->
            <UFormField label="Equipment Name" name="name" required>
              <UInput v-model="state.name" placeholder="e.g., Oscilloscope X200" :maxlength="100" />
            </UFormField>

            <!-- Type -->
            <UFormField label="Equipment Type" name="type" required>
              <UInput
                v-model="state.type"
                placeholder="e.g., Oscilloscope, Microscope"
                :maxlength="50"
              />
            </UFormField>

            <!-- Serial Number -->
            <UFormField label="Serial Number" name="serialNumber" required>
              <UInput
                v-model="state.serialNumber"
                placeholder="e.g., SN-12345-XYZ"
                :maxlength="50"
              />
            </UFormField>

            <!-- Description -->
            <UFormField label="Description (Optional)" name="description">
              <UTextarea
                v-model="state.description"
                placeholder="Additional details..."
                :rows="3"
                :maxlength="500"
              />
              <template #hint> {{ state.description?.length || 0 }}/500 characters </template>
            </UFormField>

            <!-- Lab Selection -->
            <UFormField label="Lab Location" name="labId" required>
              <USelectMenu v-model="selectedLab" :items="labOptions" placeholder="Select a lab" />
            </UFormField>

            <!-- Status -->
            <UFormField label="Status" name="status" required>
              <USelectMenu v-model="selectedStatus" :items="statusOptions" />
            </UFormField>

            <!-- Error Alert -->
            <UAlert
              v-if="error"
              color="error"
              icon="i-heroicons-information-circle-20-solid"
              :title="error"
            />

            <!-- Submit Button -->
            <div class="flex gap-3 justify-end pt-4">
              <UButton type="button" variant="outline" color="neutral" @click="cancelEdit">
                Cancel
              </UButton>
              <UButton type="submit" icon="i-heroicons-check" :loading="loading">
                Save Changes
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- View Mode -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Main Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Information -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Details</h2>
              </template>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Equipment Type
                  </label>
                  <p class="text-gray-900 dark:text-white">{{ equipment.type }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Serial Number
                  </label>
                  <p class="text-gray-900 dark:text-white font-mono">
                    {{ equipment.serialNumber }}
                  </p>
                </div>

                <div v-if="equipment.description">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p class="text-gray-600 dark:text-gray-400">{{ equipment.description }}</p>
                </div>
              </div>
            </UCard>

            <!-- Active Reservations -->
            <UCard v-if="activeReservations.length > 0">
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Active Reservations
                </h2>
              </template>

              <div class="space-y-3">
                <div
                  v-for="link in activeReservations"
                  :key="link.reservationId"
                  class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="navigateTo(`/reservations/${link.reservationId}`)"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      Reservation #{{ link.reservationId }}
                    </h3>
                    <UBadge variant="subtle">{{ link.reservation.status }}</UBadge>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {{ link.reservation.purpose }}
                  </p>
                  <div class="flex items-center gap-4 text-sm text-gray-500">
                    <div class="flex items-center gap-1">
                      <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                      <span>{{ formatDateTime(link.reservation.startTime) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <UIcon name="i-heroicons-user" class="w-4 h-4" />
                      <span>{{ link.reservation.user.email }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>

            <UCard v-else>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Active Reservations
                </h2>
              </template>
              <p class="text-gray-600 dark:text-gray-400">
                No active reservations for this equipment.
              </p>
            </UCard>
          </div>

          <!-- Right Column - Lab Info & Metadata -->
          <div class="space-y-6">
            <!-- Lab Information -->
            <UCard v-if="equipment.lab">
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Lab Location</h2>
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
                    {{ equipment.lab.building }} {{ equipment.lab.roomNumber }}
                  </p>
                </div>

                <div v-if="equipment.lab.description">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ equipment.lab.description }}
                  </p>
                </div>

                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon name="i-heroicons-users" class="w-5 h-5 text-gray-400" />
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Capacity
                    </label>
                  </div>
                  <p class="text-gray-900 dark:text-white ml-7">
                    {{ equipment.lab.capacity }} people
                  </p>
                </div>
              </div>
            </UCard>

            <!-- Metadata -->
            <UCard>
              <template #header>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Information</h2>
              </template>

              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Equipment ID
                  </label>
                  <p class="text-gray-900 dark:text-white">#{{ equipment.id }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <p class="text-gray-600 dark:text-gray-400">
                    {{ new Date(equipment.createdAt).toLocaleDateString() }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Updated
                  </label>
                  <p class="text-gray-600 dark:text-gray-400">
                    {{ new Date(equipment.updatedAt).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
