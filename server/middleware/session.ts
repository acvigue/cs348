declare module "h3" {
  interface H3EventContext {
    session: Awaited<ReturnType<typeof useSession>>;
  }
}

export default defineEventHandler(async (event) => {
  const session = await useSession(event, {
    password: useRuntimeConfig().auth.secret,
    name: "my-session",
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    },
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  event.context.session = session;
});
