export default defineEventHandler(async (event) => {
  if (!event.context.session.data.user_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  await event.context.session.clear()

  return {
    status: 200,
    body: {}
  }
})
