const isLocalProBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_PRO_BYPASS !== "false";

export function hasProAccess(user) {
  if (isLocalProBypassEnabled) {
    return true;
  }

  return user?.subscriptionPlan === "PRO" && user?.subscriptionStatus === "ACTIVE";
}

export function shouldShowLocalProBypass() {
  return isLocalProBypassEnabled;
}
