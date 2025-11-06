export default async function () {
  const headers = useRequestHeaders(["cookie"]);
  const data = await useFetch("/api/auth/me", {
    headers,
  });

  return { user: data.data, loggedIn: data.status.value !== "error" };
}
