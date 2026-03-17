export const isClerkEnabled =
  !!process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] &&
  process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] !== "pk_test_your_publishable_key";
