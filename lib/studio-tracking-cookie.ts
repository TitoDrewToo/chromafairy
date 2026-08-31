export const NO_TRACK_COOKIE = {
  maxAge: 60 * 60 * 24 * 365 * 2,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
};
