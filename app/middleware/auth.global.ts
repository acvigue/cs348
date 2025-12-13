export default defineNuxtRouteMiddleware(async (to) => {
  // Public pages
  if (to.path === '/' || to.path.startsWith('/auth/')) return

  const { loggedIn } = await useUser()
  if (!loggedIn) {
    return navigateTo('/auth/login')
  }
})
