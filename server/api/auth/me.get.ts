import prisma from '../../prisma'

export default defineEventHandler(async (event) => {
  if (!event.context.session.data.user_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: {
      id: event.context.session.data.user_id
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
