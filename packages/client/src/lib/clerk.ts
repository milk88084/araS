const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const isClerkEnabled =
  !!key && key !== "pk_test_your_publishable_key";
