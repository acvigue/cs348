<script setup lang="ts">
interface TimeSegment {
  startTime: string | Date
  endTime: string | Date
  status: string
  label: string
  metadata?: Record<string, unknown>
}

interface TimelineData {
  id: string | number
  label: string
  segments: TimeSegment[]
}

interface StatusConfig {
  color: string
  label: string
}

interface Props {
  /**
   * Array of timelines to display (for multi-line mode)
   */
  timelines?: TimelineData[]
  /**
   * Array of time segments to display (for single-line mode)
   */
  segments?: TimeSegment[]
  /**
   * Start date of the timeline
   */
  startDate: string | Date
  /**
   * End date of the timeline
   */
  endDate: string | Date
  /**
   * Configuration for each status (maps status to color and label)
   */
  statusConfig: Record<string, StatusConfig>
  /**
   * Default/idle status configuration
   */
  defaultStatus?: StatusConfig
  /**
   * Height of the timeline bar in pixels
   */
  barHeight?: number
  /**
   * Show date labels
   */
  showDateLabels?: boolean
  /**
   * Title for the timeline
   */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  barHeight: 60,
  showDateLabels: true,
  defaultStatus: () => ({ color: '#10b981', label: 'Available' })
})

const hoveredSegment = ref<{ timelineIndex: number; segmentIndex: number } | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipContent = ref<{ segment: TimeSegment; timelineLabel?: string } | null>(null)

// Convert dates to Date objects
const startDate = computed(() => new Date(props.startDate))
const endDate = computed(() => new Date(props.endDate))
const totalMs = computed(() => endDate.value.getTime() - startDate.value.getTime())

// Determine if we're in multi-line or single-line mode
const isMultiLine = computed(() => !!props.timelines && props.timelines.length > 0)

// Calculate number of days
const days = computed(() => {
  return Math.ceil(totalMs.value / (1000 * 60 * 60 * 24))
})

// Calculate timeline width based on number of days (minimum 30px per day)
const timelineWidth = computed(() => {
  const minWidthPerDay = 30 // pixels per day
  const calculatedWidth = days.value * minWidthPerDay
  return Math.max(1200, calculatedWidth)
})

// Calculate the left offset for the timeline bars
// Multi-line mode: 1rem padding + label width (150px) + gap (1rem)
// Single-line mode: 1rem padding
const timelineBarOffset = computed(() => {
  if (isMultiLine.value) {
    return 16 + 150 + 16 // padding + label width + gap (in pixels)
  }
  return 16 // just padding for single-line mode
})

// Generate day markers
const dayMarkers = computed(() => {
  const markers = []
  const current = new Date(startDate.value)

  // Start from the beginning of the first day in the range
  current.setHours(0, 0, 0, 0)

  // If startDate is not at midnight, move to the next day
  const startMidnight = new Date(startDate.value)
  startMidnight.setHours(0, 0, 0, 0)

  if (startDate.value.getTime() > startMidnight.getTime()) {
    startMidnight.setDate(startMidnight.getDate() + 1)
    current.setTime(startMidnight.getTime())
  }

  // Calculate available width after accounting for the offset
  const availableWidth = timelineWidth.value - timelineBarOffset.value

  for (let i = 0; i <= days.value; i++) {
    const date = new Date(current)
    const positionPercent = ((date.getTime() - startDate.value.getTime()) / totalMs.value) * 100
    const positionPx = (positionPercent / 100) * availableWidth

    if (positionPercent >= 0 && positionPercent <= 100) {
      markers.push({
        date: new Date(date),
        positionPercent,
        positionPx,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })
    }
    current.setDate(current.getDate() + 1)
  }

  return markers
})

// Build segments for a given array of time segments
const buildTimelineSegments = (segments: TimeSegment[]) => {
  // Sort segments by start time
  const sorted = [...segments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const result: Array<{
    segment: TimeSegment
    startPercent: number
    widthPercent: number
    color: string
    statusLabel: string
  }> = []

  let currentTime = startDate.value.getTime()

  for (const segment of sorted) {
    const segmentStart = new Date(segment.startTime).getTime()
    const segmentEnd = new Date(segment.endTime).getTime()

    // Add gap before this segment if there is one
    if (segmentStart > currentTime) {
      const gapStart = Math.max(currentTime, startDate.value.getTime())
      const gapEnd = Math.min(segmentStart, endDate.value.getTime())

      if (gapEnd > gapStart) {
        const startPercent = ((gapStart - startDate.value.getTime()) / totalMs.value) * 100
        const endPercent = ((gapEnd - startDate.value.getTime()) / totalMs.value) * 100
        const widthPercent = endPercent - startPercent

        result.push({
          segment: {
            startTime: new Date(gapStart),
            endTime: new Date(gapEnd),
            status: 'default',
            label: props.defaultStatus.label
          },
          startPercent: Math.max(0, startPercent),
          widthPercent: Math.max(0, widthPercent),
          color: props.defaultStatus.color,
          statusLabel: props.defaultStatus.label
        })
      }
    }

    // Add the actual segment (clamp to timeline bounds)
    const clampedStart = Math.max(segmentStart, startDate.value.getTime())
    const clampedEnd = Math.min(segmentEnd, endDate.value.getTime())

    if (clampedEnd > clampedStart) {
      const startPercent = ((clampedStart - startDate.value.getTime()) / totalMs.value) * 100
      const endPercent = ((clampedEnd - startDate.value.getTime()) / totalMs.value) * 100
      const widthPercent = endPercent - startPercent

      const config = props.statusConfig[segment.status] || props.defaultStatus

      result.push({
        segment: {
          ...segment,
          startTime: new Date(clampedStart),
          endTime: new Date(clampedEnd)
        },
        startPercent: Math.max(0, startPercent),
        widthPercent: Math.max(0, widthPercent),
        color: config.color,
        statusLabel: config.label
      })
    }

    currentTime = Math.max(currentTime, segmentEnd)
  }

  // Add final gap if needed
  if (currentTime < endDate.value.getTime()) {
    const gapStart = currentTime
    const gapEnd = endDate.value.getTime()

    const startPercent = ((gapStart - startDate.value.getTime()) / totalMs.value) * 100
    const endPercent = ((gapEnd - startDate.value.getTime()) / totalMs.value) * 100
    const widthPercent = endPercent - startPercent

    result.push({
      segment: {
        startTime: new Date(gapStart),
        endTime: new Date(gapEnd),
        status: 'default',
        label: props.defaultStatus.label
      },
      startPercent: Math.max(0, startPercent),
      widthPercent: Math.max(0, widthPercent),
      color: props.defaultStatus.color,
      statusLabel: props.defaultStatus.label
    })
  }

  return result
}

// Build segments for single-line mode
const timelineSegments = computed(() => {
  if (!props.segments) return []
  return buildTimelineSegments(props.segments)
})

// Build segments for multi-line mode
const multiLineSegments = computed(() => {
  if (!props.timelines) return []
  return props.timelines.map((timeline) => ({
    id: timeline.id,
    label: timeline.label,
    segments: buildTimelineSegments(timeline.segments)
  }))
})

// Format date and time
const formatDateTime = (date: Date) => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const formatDateOnly = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Handle mouse events for tooltip
const handleMouseEnter = (
  event: MouseEvent,
  segment: TimeSegment,
  timelineIndex: number,
  segmentIndex: number,
  timelineLabel?: string
) => {
  hoveredSegment.value = { timelineIndex, segmentIndex }
  tooltipContent.value = { segment, timelineLabel }
  updateTooltipPosition(event)
}

const handleMouseMove = (event: MouseEvent) => {
  if (hoveredSegment.value !== null) {
    updateTooltipPosition(event)
  }
}

const handleMouseLeave = () => {
  hoveredSegment.value = null
  tooltipContent.value = null
}

const updateTooltipPosition = (event: MouseEvent) => {
  tooltipPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
}
</script>

<template>
  <div class="gantt-chart">
    <!-- Header with title and date range -->
    <div class="gantt-header">
      <h3 v-if="title" class="gantt-title">{{ title }}</h3>
      <div v-if="showDateLabels" class="date-range">
        <span class="date-label">{{ formatDateOnly(startDate) }}</span>
        <span class="separator">→</span>
        <span class="date-label">{{ formatDateOnly(endDate) }}</span>
      </div>
    </div>

    <!-- Timeline container -->
    <div class="gantt-timeline">
      <!-- Day markers (vertical lines) -->
      <div class="day-markers" :style="{ left: `${timelineBarOffset}px` }">
        <div
          v-for="marker in dayMarkers"
          :key="marker.date.getTime()"
          class="day-marker"
          :style="{ left: `${marker.positionPx}px` }"
        >
          <div class="marker-line"></div>
          <div class="marker-label">{{ marker.label }}</div>
        </div>
      </div>

      <!-- Multi-line mode: Multiple timelines -->
      <div v-if="isMultiLine" class="timeline-multiline" :style="{ width: `${timelineWidth}px` }">
        <div
          v-for="(timeline, timelineIndex) in multiLineSegments"
          :key="timeline.id"
          class="timeline-row"
        >
          <div class="timeline-label">{{ timeline.label }}</div>
          <div class="timeline-bar">
            <div
              v-for="(item, segmentIndex) in timeline.segments"
              :key="`segment-${segmentIndex}`"
              class="timeline-segment"
              :class="{
                hovered:
                  hoveredSegment?.timelineIndex === timelineIndex &&
                  hoveredSegment?.segmentIndex === segmentIndex
              }"
              :style="{
                left: `${item.startPercent}%`,
                width: `${item.widthPercent}%`,
                backgroundColor: item.color
              }"
              @mouseenter="
                handleMouseEnter($event, item.segment, timelineIndex, segmentIndex, timeline.label)
              "
              @mousemove="handleMouseMove"
              @mouseleave="handleMouseLeave"
            />
          </div>
        </div>
      </div>

      <!-- Single-line mode: Single timeline bar -->
      <div v-else class="timeline-container" :style="{ width: `${timelineWidth}px` }">
        <div class="timeline-bar">
          <div
            v-for="(item, index) in timelineSegments"
            :key="`segment-${index}`"
            class="timeline-segment"
            :class="{
              hovered: hoveredSegment?.segmentIndex === index && hoveredSegment?.timelineIndex === 0
            }"
            :style="{
              left: `${item.startPercent}%`,
              width: `${item.widthPercent}%`,
              backgroundColor: item.color
            }"
            @mouseenter="handleMouseEnter($event, item.segment, 0, index)"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          />
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipContent"
        class="gantt-tooltip"
        :style="{
          left: `${tooltipPosition.x + 10}px`,
          top: `${tooltipPosition.y + 10}px`
        }"
      >
        <div class="tooltip-header">
          <span class="tooltip-status">{{ tooltipContent.segment.label }}</span>
          <span v-if="tooltipContent.timelineLabel" class="tooltip-timeline">
            {{ tooltipContent.timelineLabel }}
          </span>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-time">
            <UIcon name="i-heroicons-clock" class="icon" />
            <span>{{ formatDateTime(new Date(tooltipContent.segment.startTime)) }}</span>
          </div>
          <div class="tooltip-time">
            <UIcon name="i-heroicons-arrow-right" class="icon" />
            <span>{{ formatDateTime(new Date(tooltipContent.segment.endTime)) }}</span>
          </div>
          <div v-if="tooltipContent.segment.metadata" class="tooltip-metadata">
            <div
              v-for="(value, key) in tooltipContent.segment.metadata"
              :key="key"
              class="metadata-item"
            >
              <span class="metadata-key">{{ key }}:</span>
              <span class="metadata-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Legend -->
    <div class="gantt-legend">
      <div v-if="defaultStatus" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: defaultStatus.color }" />
        <span class="legend-label">{{ defaultStatus.label }}</span>
      </div>
      <div v-for="(config, status) in statusConfig" :key="status" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: config.color }" />
        <span class="legend-label">{{ config.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.gantt-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(209 213 219);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgb(156 163 175);
}

.date-label {
  font-weight: 500;
  color: rgb(209 213 219);
}

.separator {
  color: rgb(107 114 128);
}

.gantt-timeline {
  position: relative;
  width: 100%;
  background: rgb(17 24 39);
  border: 1px solid rgb(55 65 81);
  border-radius: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
}

.gantt-timeline::-webkit-scrollbar {
  height: 8px;
}

.gantt-timeline::-webkit-scrollbar-track {
  background: rgb(31 41 55);
  border-radius: 0.25rem;
}

.gantt-timeline::-webkit-scrollbar-thumb {
  background: rgb(75 85 99);
  border-radius: 0.25rem;
}

.gantt-timeline::-webkit-scrollbar-thumb:hover {
  background: rgb(107 114 128);
}

.day-markers {
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
}

.day-marker {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.marker-line {
  width: 1px;
  height: 100%;
  background: rgb(55 65 81);
}

.marker-label {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(20%);
  font-size: 0.75rem;
  color: rgb(156 163 175);
  font-weight: 500;
  white-space: nowrap;
}

.timeline-container {
  position: relative;
  padding: 3rem 1rem 2rem 1rem;
  display: flex;
  align-items: center;
  min-height: 80px;
}

.timeline-multiline {
  position: relative;
  padding: 3rem 1rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timeline-label {
  flex-shrink: 0;
  width: 150px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(209 213 219);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-bar {
  position: relative;
  flex: 1;
  width: 100%;
  height: 60px;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.timeline-multiline .timeline-bar {
  height: 40px;
}

.timeline-segment {
  position: absolute;
  top: 0;
  height: 100%;
  cursor: pointer;
  transition: all 0.2s ease;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.timeline-segment:last-child {
  border-right: none;
}

.timeline-segment:hover,
.timeline-segment.hovered {
  filter: brightness(1.2);
  z-index: 10;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

/* Tooltip */
.gantt-tooltip {
  position: fixed;
  z-index: 9999;
  background: rgb(31 41 55);
  border: 1px solid rgb(55 65 81);
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2);
  max-width: 300px;
  pointer-events: none;
}

.tooltip-header {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgb(55 65 81);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tooltip-status {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(209 213 219);
}

.tooltip-timeline {
  font-size: 0.75rem;
  color: rgb(156 163 175);
  font-weight: 500;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tooltip-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgb(156 163 175);
}

.tooltip-time .icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.tooltip-metadata {
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgb(55 65 81);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.metadata-key {
  color: rgb(107 114 128);
  font-weight: 500;
}

.metadata-value {
  color: rgb(209 213 219);
}

/* Legend */
.gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem;
  background: rgb(17 24 39);
  border-radius: 0.375rem;
  border: 1px solid rgb(55 65 81);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
}

.legend-label {
  font-size: 0.875rem;
  color: rgb(156 163 175);
}
</style>
