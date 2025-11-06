import { compare } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'

export default defineEventHandler(async (event) => {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })

  const body = await readValidatedBody(event, loginSchema.parse)

  const user = await prisma.user.findFirst({
    where: {
      email: body.email
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  // validate password
  const valid = await compare(body.password, user.password)

  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  await event.context.session.update({
    user_id: user.id
  })

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
