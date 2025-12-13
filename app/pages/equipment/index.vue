<script setup lang="ts">
import type { ComputedEquipmentStatus } from '~/types/equipment'
import type { PaginationMeta } from '~/types/pagination'

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

const statusOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'In Use', value: 'IN_USE' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Out of Order', value: 'OUT_OF_ORDER' }
]

const equipmentQuery = computed(() => ({
  page: page.value,
  results_per_page: perPage.value,
  status: statusFilter.value !== 'ALL' ? statusFilter.value : undefined,
  lab_id: labFilter.value !== 'ALL' ? labFilter.value : undefined
}))

// Fetch equipment
const {
  data: equipmentData,
  pending,
  refresh
} = await useFetch('/api/equipment', {
  query: equipmentQuery,
  watch: [equipmentQuery]
})

// Fetch labs for filtering
const labsQuery = computed(() => ({ results_per_page: 100 }))
const { data: labsData } = await useFetch('/api/labs', {
  query: labsQuery
})

const equipment = computed(() => equipmentData.value?.equipment || [])
const pagination = computed<PaginationMeta | undefined>(() => equipmentData.value?.pagination)
const labs = computed(() => labsData.value?.labs || [])

const labOptions = computed(() => [
  { label: 'All Labs', value: 'ALL' },
  ...labs.value.map((lab) => ({
    label: `${lab.building} ${lab.roomNumber}`,
    value: lab.id
  }))
])

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
      <PageHeader title="Equipment" description="Browse and manage lab equipment inventory">
        <template #actions>
          <UButton v-if="canManageEquipment" to="/equipment/new" icon="i-heroicons-plus" size="lg">
            Add Equipment
          </UButton>
        </template>
      </PageHeader>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <USelectMenu v-model="statusFilter" :items="statusOptions" value-key="value" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Lab
            </label>
            <USelectMenu v-model="labFilter" :items="labOptions" value-key="value" />
          </div>
        </div>
      </UCard>

      <!-- Equipment List -->
      <LoadingSpinner v-if="pending" />

      <EmptyState
        v-else-if="equipment.length === 0"
        icon="i-heroicons-beaker"
        title="No equipment found"
        :description="
          statusFilter === 'ALL' && labFilter === 'ALL'
            ? 'No equipment available.'
            : 'No equipment matches the selected filters.'
        "
      >
        <template #action>
          <UButton v-if="canManageEquipment" to="/equipment/new" icon="i-heroicons-plus">
            Add Equipment
          </UButton>
        </template>
      </EmptyState>

      <div v-else class="space-y-4">
        <UCard
          v-for="item in equipment"
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
                <InfoRow icon="i-heroicons-tag" label="Type" :value="item.type" />
                <InfoRow icon="i-heroicons-hashtag" label="Serial #" :value="item.serialNumber" />
                <InfoRow icon="i-heroicons-building-office-2" label="Lab">
                  {{ item.lab?.building }} {{ item.lab?.roomNumber }}
                </InfoRow>
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
      <div v-if="pagination && pagination.totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model:page="page"
          :items-per-page="pagination?.perPage ?? perPage"
          :total="pagination.totalResults"
        />
      </div>
    </UContainer>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model="deleteModal"
      title="Delete Equipment"
      :description="`Are you sure you want to delete ${equipmentToDelete?.name}? This action cannot be undone.`"
      confirm-text="Delete Equipment"
      warning-message="Equipment with active reservations cannot be deleted."
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteModal = false"
    />
  </div>
</template>
