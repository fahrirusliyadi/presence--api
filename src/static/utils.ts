export const getStaticUrl = (path: string) => {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
};
