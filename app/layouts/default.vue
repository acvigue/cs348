<script setup lang="ts">
const links = [
  {
    label: 'Home',
    icon: 'i-heroicons-home',
    to: '/'
  }
]

const me = await useUser()

if (me.loggedIn) {
  links.push({
    label: 'Logout',
    icon: 'i-heroicons-lock-closed',
    to: '/auth/logout'
  })
}

const siteName = useAppConfig().public.siteName
</script>

<template>
  <div>
    <NuxtLoadingIndicator />
    <UHeader :title="siteName">
      <UNavigationMenu :items="links" />
    </UHeader>

    <UMain>
      <slot />
    </UMain>
  </div>
</template>
