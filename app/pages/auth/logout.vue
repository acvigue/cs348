<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const resp = await useFetch('/api/auth/logout')

if (resp.data.value) {
  navigateTo('/')
} else {
  console.error('Failed to logout')
}
</script>

<template>
  <UCard class="max-w-sm w-full">
    <p>wait...</p>
  </UCard>
</template>
