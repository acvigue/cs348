<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = await useUser()
const toast = useToast()

useHead({
  title: 'Reports & Analytics - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content:
        'Comprehensive utilization reports, GANTT charts, and detailed analytics for lab equipment reservations'
    }
  ]
})

const isInstructorOrAdmin = computed(() => {
  return user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
})

// Tab management
const tabs = computed(() => {
  const baseTabs = [
    {
      key: 'my-utilization',
      label: 'My Utilization',
      icon: 'i-heroicons-chart-bar',
      description: 'View your personal reservation history and utilization statistics'
    }
  ]

  if (isInstructorOrAdmin.value) {
    baseTabs.push(
      {
        key: 'equipment',
        label: 'Equipment Analytics',
        icon: 'i-heroicons-cpu-chip',
        description: 'Detailed equipment utilization with GANTT charts and percentages'
      },
      {
        key: 'students',
        label: 'Student Analytics',
        icon: 'i-heroicons-users',
        description: 'Student usage patterns and percentage breakdowns'
      },
      {
        key: 'labs',
        label: 'Lab Analytics',
        icon: 'i-heroicons-building-office-2',
        description: 'Lab-wide utilization statistics and comparisons'
      }
    )
  }

  return baseTabs
})

const selectedTab = ref(tabs.value[0]?.key || 'my-utilization')

// Date range picker
const dateRange = ref({
  start: new Date(new Date().setDate(new Date().getDate() - 30)),
  end: new Date()
})

const formattedDateRange = computed(() => {
  const startDate =
    dateRange.value.start instanceof Date ? dateRange.value.start : new Date(dateRange.value.start)
  const endDate =
    dateRange.value.end instanceof Date ? dateRange.value.end : new Date(dateRange.value.end)

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString()
  }
})

// Fetch labs for filtering
const { data: labsData } = await useFetch('/api/labs')
const labs = computed(() => labsData.value?.labs || [])

// Fetch equipment for filtering
const { data: equipmentData } = await useFetch('/api/equipment', {
  query: { results_per_page: 1000 }
})
const allEquipment = computed(() => equipmentData.value?.equipment || [])

// Filter states
const selectedLab = ref<number | null>(null)
const selectedEquipmentIds = ref<number[]>([])

// Student utilization data
const {
  data: studentUtilizationData,
  pending: studentUtilizationPending,
  refresh: refreshStudentUtilization,
  error: studentUtilizationError
} = await useFetch('/api/reports/student-utilization', {
  query: formattedDateRange,
  watch: [formattedDateRange]
})

// Debug logging
watch(studentUtilizationData, (newData) => {
  console.log('Student Utilization Data:', newData)
  if (newData?.body) {
    console.log('Timeline data:', newData.body.timeline)
    console.log('Start date:', newData.body.start_date)
    console.log('End date:', newData.body.end_date)
  }
})

watch(studentUtilizationError, (error) => {
  if (error) {
    console.error('Student utilization error:', error)
  }
})

// Equipment utilization data
const equipmentQueryParams = computed(() => {
  const params: Record<string, string | number> = {
    ...formattedDateRange.value
  }

  if (selectedLab.value) {
    params.lab_id = selectedLab.value
  }

  if (selectedEquipmentIds.value.length > 0) {
    params.equipment_ids = selectedEquipmentIds.value.join(',')
  }

  return params
})

const {
  data: equipmentUtilizationData,
  pending: equipmentUtilizationPending,
  refresh: refreshEquipmentUtilization
} = await useFetch('/api/reports/equipment-utilization', {
  query: equipmentQueryParams,
  watch: [equipmentQueryParams]
})

// Student statistics data
const {
  data: studentStatisticsData,
  pending: studentStatisticsPending,
  refresh: refreshStudentStatistics
} = await useFetch('/api/reports/student-statistics', {
  query: formattedDateRange,
  watch: [formattedDateRange]
})

// Lab statistics data
const {
  data: labStatisticsData,
  pending: labStatisticsPending,
  refresh: refreshLabStatistics
} = await useFetch('/api/reports/lab-statistics', {
  query: formattedDateRange,
  watch: [formattedDateRange]
})

// Refresh data when date range changes
watch(formattedDateRange, () => {
  refreshStudentUtilization()
  if (isInstructorOrAdmin.value) {
    refreshEquipmentUtilization()
    refreshStudentStatistics()
    refreshLabStatistics()
  }
})

// Refresh equipment data when filters change
watch([selectedLab, selectedEquipmentIds], () => {
  if (isInstructorOrAdmin.value && selectedTab.value === 'equipment') {
    refreshEquipmentUtilization()
  }
})

// Status configuration for GANTT chart
const statusConfig = {
  PENDING: { color: '#fbbf24', label: 'Pending' },
  CONFIRMED: { color: '#3b82f6', label: 'Confirmed' },
  IN_PROGRESS: { color: '#8b5cf6', label: 'In Progress' },
  COMPLETED: { color: '#10b981', label: 'Completed' },
  CANCELLED: { color: '#ef4444', label: 'Cancelled' }
}

// Default status for timeline gaps (available/idle time)
const defaultStatus = { color: '#374151', label: 'Available' }

// Equipment filter by lab
const filteredEquipment = computed(() => {
  if (!selectedLab.value) return allEquipment.value
  return allEquipment.value.filter((eq) => eq.labId === selectedLab.value)
})

// Format minutes to hours and minutes
const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Format percentage
const formatPercent = (value: number) => {
  return value.toFixed(1) + '%'
}

// Quick date range presets
const applyDatePreset = (days: number) => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  dateRange.value = { start, end }
}

// Export report data (placeholder)
const exportReport = () => {
  toast.add({
    title: 'Export functionality',
    description: 'Report export feature coming soon!',
    color: 'info'
  })
}
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-3">
        Reports & Analytics Dashboard
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Comprehensive utilization reports with GANTT charts, detailed statistics, and percentage
        breakdowns
      </p>
    </div>

    <!-- Date Range Selector -->
    <UCard class="mb-6 border-2 border-primary-500/20">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-calendar" class="text-2xl text-primary-500" />
            <div>
              <span class="font-semibold text-gray-900 dark:text-white text-lg">
                Report Period
              </span>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Select the time range for your analysis
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="sm" variant="soft" color="primary" @click="applyDatePreset(7)">
              Last 7 Days
            </UButton>
            <UButton size="sm" variant="soft" color="primary" @click="applyDatePreset(30)">
              Last 30 Days
            </UButton>
            <UButton size="sm" variant="soft" color="primary" @click="applyDatePreset(90)">
              Last Quarter
            </UButton>
            <UButton size="sm" variant="soft" color="primary" @click="applyDatePreset(365)">
              Last Year
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              icon="i-heroicons-arrow-down-tray"
              @click="exportReport"
            >
              Export
            </UButton>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              v-model="dateRange.start"
              type="date"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              v-model="dateRange.end"
              type="date"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white transition"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Tabs -->
    <UTabs v-model="selectedTab" :items="tabs" class="mb-6" />

    <!-- My Utilization Tab -->
    <div v-if="selectedTab === 'my-utilization'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                My Reservation Utilization
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Personal reservation history and usage patterns
              </p>
            </div>
            <UButton
              icon="i-heroicons-arrow-path"
              size="sm"
              variant="soft"
              :loading="studentUtilizationPending"
              @click="() => refreshStudentUtilization()"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <div v-if="studentUtilizationPending" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-primary-500" />
        </div>

        <div v-else-if="studentUtilizationError" class="text-center py-16">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-6xl text-red-500 mb-4" />
          <p class="text-red-600 dark:text-red-400 text-lg mb-2">Error loading report data</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm">{{ studentUtilizationError }}</p>
        </div>

        <div v-else-if="studentUtilizationData?.body">
          <!-- Statistics Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <UCard
              class="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {{ studentUtilizationData.body.total_reservations }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Reservations
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-green-600 dark:text-green-400">
                  {{ formatMinutes(studentUtilizationData.body.total_duration_minutes) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Duration
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {{ formatMinutes(studentUtilizationData.body.average_duration_minutes) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Average Duration
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {{ Object.keys(studentUtilizationData.body.equipment_usage).length }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Equipment Types Used
                </div>
              </div>
            </UCard>
          </div>

          <!-- Status Breakdown -->
          <div class="mb-8">
            <h3
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-chart-pie" class="text-2xl text-primary-500" />
              Reservations by Status
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                v-for="(statusValue, statusKey) in studentUtilizationData.body.by_status"
                :key="statusKey"
                class="p-4 rounded-xl border-2 bg-linear-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:scale-105 transition-transform"
                :style="{
                  borderColor: statusConfig[statusKey as keyof typeof statusConfig].color
                }"
              >
                <div
                  class="text-3xl font-bold mb-1"
                  :style="{
                    color: statusConfig[statusKey as keyof typeof statusConfig].color
                  }"
                >
                  {{ statusValue }}
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {{ statusConfig[statusKey as keyof typeof statusConfig].label }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {{
                    ((statusValue / studentUtilizationData.body.total_reservations) * 100).toFixed(
                      1
                    )
                  }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Equipment Usage Breakdown -->
          <div class="mb-8">
            <h3
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-cube" class="text-2xl text-primary-500" />
              Equipment Usage Distribution
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="(count, equipment) in studentUtilizationData.body.equipment_usage"
                :key="equipment"
                class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ equipment }}
                  </span>
                  <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {{ count }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    class="bg-primary-600 h-2 rounded-full"
                    :style="{
                      width: `${(count / studentUtilizationData.body.total_reservations) * 100}%`
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lab Usage Breakdown -->
          <div class="mb-8">
            <h3
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-building-office-2" class="text-2xl text-primary-500" />
              Lab Usage Distribution
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="(count, lab) in studentUtilizationData.body.lab_usage"
                :key="lab"
                class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ lab }}
                  </span>
                  <span class="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {{ count }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    class="bg-blue-600 h-3 rounded-full"
                    :style="{
                      width: `${(count / studentUtilizationData.body.total_reservations) * 100}%`
                    }"
                  ></div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {{ ((count / studentUtilizationData.body.total_reservations) * 100).toFixed(1) }}%
                  of total
                </div>
              </div>
            </div>
          </div>

          <!-- GANTT Chart -->
          <div
            v-if="studentUtilizationData?.body?.timeline?.length > 0"
            class="border-t border-gray-200 dark:border-gray-700 pt-8"
          >
            <h3
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-chart-bar-square" class="text-2xl text-primary-500" />
              Reservation Timeline (GANTT Chart)
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Visual timeline showing all your reservations across the selected period
            </p>
            <GanttChart
              v-if="studentUtilizationData?.body"
              :segments="studentUtilizationData.body.timeline"
              :start-date="studentUtilizationData.body.start_date"
              :end-date="studentUtilizationData.body.end_date"
              :status-config="statusConfig"
              :default-status="defaultStatus"
              title="My Reservations"
            />
          </div>
          <div v-else class="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div class="text-center py-8">
              <UIcon name="i-heroicons-calendar-days" class="text-5xl text-gray-400 mb-3" />
              <p class="text-gray-500 dark:text-gray-400">No reservations to display on timeline</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-16">
          <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400 mb-4" />
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            No reservation data available for the selected period
          </p>
        </div>
      </UCard>
    </div>

    <!-- Equipment Reports Tab -->
    <div v-if="selectedTab === 'equipment' && isInstructorOrAdmin">
      <div class="space-y-6">
        <!-- Filters -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-funnel" class="text-xl" />
              Filters & Options
            </h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Lab
              </label>
              <select
                v-model="selectedLab"
                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
              >
                <option :value="null">All Labs</option>
                <option v-for="lab in labs" :key="lab.id" :value="lab.id">
                  {{ lab.building }} {{ lab.roomNumber }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Specific Equipment (Optional)
              </label>
              <select
                v-model="selectedEquipmentIds"
                multiple
                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                size="5"
              >
                <option v-for="eq in filteredEquipment" :key="eq.id" :value="eq.id">
                  {{ eq.name }} ({{ eq.serialNumber }})
                </option>
              </select>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Hold Cmd/Ctrl to select multiple items. Leave empty to show all equipment.
              </p>
            </div>
          </div>
        </UCard>

        <!-- Equipment Utilization Data -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                  Equipment Utilization Report
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Comprehensive equipment usage with GANTT charts and utilization percentages
                </p>
              </div>
              <UButton
                icon="i-heroicons-arrow-path"
                size="sm"
                variant="soft"
                :loading="equipmentUtilizationPending"
                @click="() => refreshEquipmentUtilization()"
              >
                Refresh
              </UButton>
            </div>
          </template>

          <div v-if="equipmentUtilizationPending" class="flex justify-center py-16">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-primary-500" />
          </div>

          <div
            v-else-if="
              equipmentUtilizationData?.body?.equipment_usage &&
              equipmentUtilizationData.body.equipment_usage.length > 0
            "
          >
            <!-- Summary Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <UCard
                class="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
              >
                <div class="text-center">
                  <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {{ equipmentUtilizationData?.body?.total_equipment ?? 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Equipment Items
                  </div>
                </div>
              </UCard>
              <UCard
                class="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
              >
                <div class="text-center">
                  <div class="text-4xl font-bold text-green-600 dark:text-green-400">
                    {{ equipmentUtilizationData?.body?.total_reservations ?? 0 }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Total Reservations
                  </div>
                </div>
              </UCard>
              <UCard
                class="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
              >
                <div class="text-center">
                  <div class="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {{ formatMinutes(equipmentUtilizationData?.body?.total_duration_minutes ?? 0) }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Total Usage Time
                  </div>
                </div>
              </UCard>
              <UCard
                class="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
              >
                <div class="text-center">
                  <div class="text-4xl font-bold text-orange-600 dark:text-orange-400">
                    {{
                      formatPercent(
                        equipmentUtilizationData?.body?.average_utilization_percent ?? 0
                      )
                    }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Avg Utilization
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Equipment Details -->
            <div class="space-y-6">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-queue-list" class="text-2xl text-primary-500" />
                Detailed Equipment Analysis
              </h3>
              <div
                v-for="equipment in equipmentUtilizationData?.body?.equipment_usage ?? []"
                :key="equipment.equipment_id"
                class="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-linear-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:border-primary-500 transition-colors"
              >
                <div class="flex items-start justify-between mb-6">
                  <div>
                    <h4 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {{ equipment.equipment_name }}
                    </h4>
                    <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-building-office-2" />
                        {{ equipment.lab_name }}
                      </span>
                      <span class="flex items-center gap-1">
                        <UIcon name="i-heroicons-hashtag" />
                        {{ equipment.serial_number }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                      {{ formatPercent(equipment.utilization_percent) }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Utilization Rate
                    </div>
                  </div>
                </div>

                <!-- Utilization Bar -->
                <div class="mb-6">
                  <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Utilization Progress</span>
                    <span>{{ formatPercent(equipment.utilization_percent) }}</span>
                  </div>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      class="h-4 rounded-full transition-all duration-500 bg-linear-to-r from-primary-500 to-primary-600"
                      :style="{ width: `${Math.min(equipment.utilization_percent, 100)}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Statistics Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div
                    class="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div class="font-bold text-xl text-gray-900 dark:text-white">
                      {{ equipment.total_reservations }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Total Reservations
                    </div>
                  </div>
                  <div
                    class="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div class="font-bold text-xl text-gray-900 dark:text-white">
                      {{ formatMinutes(equipment.total_duration_minutes) }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Time</div>
                  </div>
                  <div
                    class="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div class="font-bold text-xl text-gray-900 dark:text-white">
                      {{ formatMinutes(equipment.average_duration_minutes) }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg Duration</div>
                  </div>
                  <div
                    class="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div class="font-bold text-xl text-gray-900 dark:text-white">
                      {{ equipment.unique_users }}
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Unique Users</div>
                  </div>
                </div>

                <!-- GANTT Chart for Equipment -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h5
                    class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
                  >
                    <UIcon name="i-heroicons-chart-bar-square" />
                    Reservation Timeline
                  </h5>
                  <GanttChart
                    :segments="equipment.timeline"
                    :start-date="equipmentUtilizationData.body.start_date"
                    :end-date="equipmentUtilizationData.body.end_date"
                    :status-config="statusConfig"
                    :default-status="defaultStatus"
                    :bar-height="50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-16">
            <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400 mb-4" />
            <p class="text-gray-500 dark:text-gray-400 text-lg">
              No equipment utilization data available for the selected period and filters
            </p>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Student Statistics Tab -->
    <div v-if="selectedTab === 'students' && isInstructorOrAdmin">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                Student Utilization Statistics
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Comprehensive breakdown of student usage patterns and percentages
              </p>
            </div>
            <UButton
              icon="i-heroicons-arrow-path"
              size="sm"
              variant="soft"
              :loading="studentStatisticsPending"
              @click="() => refreshStudentStatistics()"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <div v-if="studentStatisticsPending" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-primary-500" />
        </div>

        <div
          v-else-if="
            studentStatisticsData?.body?.students && studentStatisticsData.body.students.length > 0
          "
        >
          <!-- Summary -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <UCard
              class="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {{ studentStatisticsData?.body?.total_students ?? 0 }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Active Students
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-green-600 dark:text-green-400">
                  {{ studentStatisticsData?.body?.total_reservations ?? 0 }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Reservations
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {{ formatMinutes(studentStatisticsData?.body?.total_duration_minutes ?? 0) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Usage Time
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {{ formatMinutes(studentStatisticsData?.body?.average_time_per_student ?? 0) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Avg per Student
                </div>
              </div>
            </UCard>
          </div>

          <!-- Student Table -->
          <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Student
                  </th>
                  <th
                    class="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Reservations
                  </th>
                  <th
                    class="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Total Time
                  </th>
                  <th
                    class="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Avg Time
                  </th>
                  <th
                    class="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    % of Total Usage
                  </th>
                  <th
                    class="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Status Breakdown
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <tr
                  v-for="student in studentStatisticsData?.body?.students ?? []"
                  :key="student.user_id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ student.user_name }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ student.user_email }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-lg font-bold text-gray-900 dark:text-white">
                      {{ student.total_reservations }}
                    </span>
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ formatMinutes(student.total_duration_minutes) }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ formatMinutes(student.average_duration_minutes) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col items-center gap-2">
                      <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {{ formatPercent(student.percentage_of_total) }}
                      </span>
                      <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          class="bg-linear-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all"
                          :style="{ width: `${Math.min(student.percentage_of_total, 100)}%` }"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex justify-center gap-2 text-xs">
                      <div class="text-center">
                        <div class="font-bold text-green-600">
                          {{ student.completed_reservations }}
                        </div>
                        <div class="text-gray-500">Done</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-blue-600">
                          {{ student.confirmed_reservations }}
                        </div>
                        <div class="text-gray-500">Active</div>
                      </div>
                      <div class="text-center">
                        <div class="font-bold text-red-600">
                          {{ student.cancelled_reservations }}
                        </div>
                        <div class="text-gray-500">Cancel</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="text-center py-16">
          <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400 mb-4" />
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            No student statistics available for the selected period
          </p>
        </div>
      </UCard>
    </div>

    <!-- Lab Statistics Tab -->
    <div v-if="selectedTab === 'labs' && isInstructorOrAdmin">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                Lab Utilization Statistics
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Comprehensive lab usage analysis with equipment breakdowns and percentages
              </p>
            </div>
            <UButton
              icon="i-heroicons-arrow-path"
              size="sm"
              variant="soft"
              :loading="labStatisticsPending"
              @click="() => refreshLabStatistics()"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <div v-if="labStatisticsPending" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-primary-500" />
        </div>

        <div v-else-if="labStatisticsData?.body?.labs && labStatisticsData.body.labs.length > 0">
          <!-- Summary -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <UCard
              class="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {{ labStatisticsData?.body?.total_labs ?? 0 }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Active Labs
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-green-600 dark:text-green-400">
                  {{ labStatisticsData?.body?.total_reservations ?? 0 }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Reservations
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {{ labStatisticsData?.body?.total_equipment ?? 0 }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Total Equipment
                </div>
              </div>
            </UCard>
            <UCard
              class="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
            >
              <div class="text-center">
                <div class="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {{ formatPercent(labStatisticsData?.body?.average_lab_utilization ?? 0) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Avg Utilization
                </div>
              </div>
            </UCard>
          </div>

          <!-- Lab Details -->
          <div class="space-y-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-building-office-2" class="text-2xl text-primary-500" />
              Detailed Lab Analysis
            </h3>
            <div
              v-for="lab in labStatisticsData?.body?.labs ?? []"
              :key="lab.lab_id"
              class="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-linear-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:border-primary-500 transition-colors"
            >
              <div class="flex items-start justify-between mb-6">
                <div>
                  <h4 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {{ lab.lab_name }}
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ lab.total_equipment }} equipment items • {{ lab.unique_users }} unique users
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {{ formatPercent(lab.utilization_percent) }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Utilization Rate
                  </div>
                </div>
              </div>

              <!-- Utilization Bar -->
              <div class="mb-6">
                <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Lab Utilization</span>
                  <span>{{ formatPercent(lab.percentage_of_total) }} of total system usage</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                  <div
                    class="h-5 rounded-full transition-all duration-500 bg-linear-to-r from-primary-500 to-primary-600"
                    :style="{ width: `${Math.min(lab.utilization_percent, 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Lab Statistics -->
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div
                  class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ lab.total_reservations }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Reservations</div>
                </div>
                <div
                  class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatMinutes(lab.total_duration_minutes) }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Time</div>
                </div>
                <div
                  class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatMinutes(lab.average_reservation_duration) }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg Duration</div>
                </div>
                <div
                  class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ lab.unique_users }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Unique Users</div>
                </div>
                <div
                  class="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatPercent(lab.percentage_of_total) }}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">% of Total</div>
                </div>
              </div>

              <!-- Equipment Breakdown -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h5
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
                >
                  <UIcon name="i-heroicons-cube" />
                  Equipment Breakdown
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div
                    v-for="equipment in lab.equipment_breakdown"
                    :key="equipment.equipment_id"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ equipment.equipment_name }}
                      </span>
                      <span class="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {{ formatPercent(equipment.utilization_percent) }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {{ equipment.reservation_count }} reservations
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        class="bg-primary-600 h-2 rounded-full"
                        :style="{ width: `${Math.min(equipment.utilization_percent, 100)}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-16">
          <UIcon name="i-heroicons-inbox" class="text-6xl text-gray-400 mb-4" />
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            No lab statistics available for the selected period
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
