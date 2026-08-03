/**
 * Secret admin registration code.
 *
 * A user can only register as an ADMIN if they know this code — it is
 * validated server-side in `users.completeProfile` (never sent to the
 * client). Change it here to your own value.
 */
export const ADMIN_SIGNUP_CODE = "Bskbertrand7@";

/** Default marketplace currency (USD). */
export const DEFAULT_CURRENCY = "USD";
