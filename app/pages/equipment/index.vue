<script setup lang="ts">
import type { ComputedEquipmentStatus } from '~/types/equipment'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'Equipment - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Browse and manage lab equipment'
    }
  ]
})

const { user } = await useUser()
const toast = useToast()

// Check if user is instructor or admin
const canManageEquipment = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Pagination and filtering
const page = ref(1)
const perPage = ref(20)
const statusFilter = ref<ComputedEquipmentStatus | 'ALL'>('ALL')
const labFilter = ref<number | 'ALL'>('ALL')

// Fetch equipment
const {
  data: equipmentData,
  pending,
  refresh
} = await useFetch('/api/equipment', {
  query: {
    page,
    results_per_page: perPage
  },
  watch: [page, perPage]
})

// Fetch labs for filtering
const { data: labsData } = await useFetch('/api/labs', {
  query: { results_per_page: 100 }
})

const equipment = computed(() => equipmentData.value?.equipment || [])
const pagination = computed(() => equipmentData.value?.pagination)
const labs = computed(() => labsData.value?.labs || [])

// Filter equipment by status and lab
const filteredEquipment = computed(() => {
  let filtered = equipment.value

  if (statusFilter.value !== 'ALL') {
    filtered = filtered.filter((e) => e.status === statusFilter.value)
  }

  if (labFilter.value !== 'ALL') {
    filtered = filtered.filter((e) => e.labId === labFilter.value)
  }

  return filtered
})

const statusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'In Use', value: 'IN_USE' },
  { label: 'Operational', value: 'OPERATIONAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Out of Order', value: 'OUT_OF_ORDER' }
]

const labOptions = computed(() => [
  { label: 'All Labs', value: 'ALL' },
  ...labs.value.map((lab) => ({
    label: `${lab.building} ${lab.roomNumber}`,
    value: lab.id
  }))
])

const selectedStatusOption = computed({
  get: () => statusOptions.find((opt) => opt.value === statusFilter.value) || statusOptions[0],
  set: (val) => {
    if (val) statusFilter.value = val.value as ComputedEquipmentStatus | 'ALL'
  }
})

const selectedLabOption = computed({
  get: () => labOptions.value.find((opt) => opt.value === labFilter.value) || labOptions.value[0],
  set: (val) => {
    if (val) labFilter.value = val.value as number | 'ALL'
  }
})

// Delete confirmation modal
const deleteModal = ref(false)
const equipmentToDelete = ref<{ id: number; name: string } | null>(null)
const deleteLoading = ref(false)

const openDeleteModal = (eq: { id: number; name: string }) => {
  equipmentToDelete.value = eq
  deleteModal.value = true
}

const confirmDelete = async () => {
  if (!equipmentToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/equipment/${equipmentToDelete.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Equipment deleted successfully',
      color: 'success'
    })
    deleteModal.value = false
    equipmentToDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Error',
      description:
        (err as { data?: { message?: string } })?.data?.message || 'Failed to delete equipment',
      color: 'error'
    })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <UContainer class="py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Equipment</h1>
            <p class="text-gray-600 dark:text-gray-400">
              Browse and manage lab equipment inventory
            </p>
          </div>
          <UButton v-if="canManageEquipment" to="/equipment/new" icon="i-heroicons-plus" size="lg">
            Add Equipment
          </UButton>
        </div>
      </div>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <USelectMenu v-model="selectedStatusOption" :items="statusOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Lab
            </label>
            <USelectMenu v-model="selectedLabOption" :items="labOptions" />
          </div>
        </div>
      </UCard>

      <!-- Equipment List -->
      <UCard v-if="pending">
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
        </div>
      </UCard>

      <UCard v-else-if="filteredEquipment.length === 0">
        <div class="text-center py-12">
          <UIcon name="i-heroicons-beaker" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No equipment found</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{
              statusFilter === 'ALL' && labFilter === 'ALL'
                ? 'No equipment available.'
                : 'No equipment matches the selected filters.'
            }}
          </p>
          <UButton v-if="canManageEquipment" to="/equipment/new" icon="i-heroicons-plus">
            Add Equipment
          </UButton>
        </div>
      </UCard>

      <div v-else class="space-y-4">
        <UCard
          v-for="item in filteredEquipment"
          :key="item.id"
          class="hover:shadow-lg transition-shadow"
          :class="canManageEquipment ? '' : 'cursor-pointer'"
          @click="!canManageEquipment && navigateTo(`/equipment/${item.id}`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-3">
                <EquipmentStatusBadge :status="item.status" size="lg" />
                <span class="text-sm text-gray-600 dark:text-gray-400"> ID: #{{ item.id }} </span>
              </div>

              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {{ item.name }}
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div class="flex items-start gap-2">
                  <UIcon name="i-heroicons-tag" class="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Type</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ item.type }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon name="i-heroicons-hashtag" class="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Serial #</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ item.serialNumber }}</p>
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="w-5 h-5 text-gray-400 mt-0.5"
                  />
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Lab</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ item.lab?.building }} {{ item.lab?.roomNumber }}
                    </p>
                  </div>
                </div>
              </div>

              <p
                v-if="item.description"
                class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
              >
                {{ item.description }}
              </p>
            </div>

            <!-- Actions for Instructors/Admins -->
            <div v-if="canManageEquipment" class="flex items-center gap-2 ml-4">
              <UButton
                icon="i-heroicons-pencil-square"
                variant="outline"
                color="primary"
                size="sm"
                @click="navigateTo(`/equipment/${item.id}`)"
              >
                Edit
              </UButton>
              <UButton
                icon="i-heroicons-trash"
                variant="outline"
                color="error"
                size="sm"
                @click="openDeleteModal({ id: item.id, name: item.name })"
              >
                Delete
              </UButton>
            </div>

            <!-- Arrow for Students -->
            <UIcon v-else name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400 ml-4" />
          </div>
        </UCard>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total_pages > 1" class="mt-8 flex justify-center">
        <UPagination v-model="page" :page-count="perPage" :total="pagination.total_results" />
      </div>
    </UContainer>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="deleteModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Equipment</h3>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete
              <strong class="text-gray-900 dark:text-white">{{ equipmentToDelete?.name }}</strong
              >? This action cannot be undone.
            </p>

            <UAlert
              color="warning"
              icon="i-heroicons-information-circle-20-solid"
              title="Warning"
              description="Equipment with active reservations cannot be deleted."
            />
          </div>

          <template #footer>
            <div class="flex gap-3 justify-end">
              <UButton
                variant="outline"
                color="neutral"
                :disabled="deleteLoading"
                @click="deleteModal = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                icon="i-heroicons-trash"
                :loading="deleteLoading"
                @click="confirmDelete"
              >
                Delete Equipment
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
