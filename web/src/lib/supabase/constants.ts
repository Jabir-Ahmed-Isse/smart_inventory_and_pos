/** Request header the middleware uses to forward the validated user id to
 *  Server Components, letting them skip a redundant auth.getUser() round-trip. */
export const USER_ID_HEADER = "x-user-id";
