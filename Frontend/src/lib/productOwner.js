const PRODUCT_OWNER_EMAILS = String(import.meta.env.VITE_PRODUCT_OWNER_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isProductOwner(userOrEmail) {
  const email = typeof userOrEmail === "string"
    ? userOrEmail
    : userOrEmail?.email;

  return PRODUCT_OWNER_EMAILS.includes(String(email || "").trim().toLowerCase());
}

export function getProductOwnerEmails() {
  return PRODUCT_OWNER_EMAILS;
}
