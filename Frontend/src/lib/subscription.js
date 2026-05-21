const DEFAULT_TRIAL_HOURS = 200;
const HOUR_IN_MS = 60 * 60 * 1000;

const isLocalProBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_PRO_BYPASS !== "false";

const toTimestamp = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
};

const getTrialHoursTotal = (source) => {
  const hours = Number(source?.trialHoursTotal || DEFAULT_TRIAL_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TRIAL_HOURS;
};

export function hasProAccess(user) {
  if (isLocalProBypassEnabled) {
    return true;
  }

  if (user?.subscriptionPlan !== "PRO" || user?.subscriptionStatus !== "ACTIVE") {
    return false;
  }

  const renewsAtTimestamp = toTimestamp(user?.subscriptionRenewsAt);
  return !renewsAtTimestamp || renewsAtTimestamp >= Date.now();
}

export function getTrialState(source) {
  const hoursTotal = getTrialHoursTotal(source);
  const startTimestamp = toTimestamp(source?.trialStartsAt || source?.createdAt);
  const endTimestamp = toTimestamp(source?.trialEndsAt)
    || (startTimestamp ? startTimestamp + (hoursTotal * HOUR_IN_MS) : null);

  if (!endTimestamp) {
    return {
      hoursTotal,
      isKnown: false,
      isActive: false,
      remainingMs: 0,
      startsAt: null,
      endsAt: null
    };
  }

  const remainingMs = Math.max(0, endTimestamp - Date.now());

  return {
    hoursTotal,
    isKnown: true,
    isActive: remainingMs > 0,
    remainingMs,
    startsAt: startTimestamp ? new Date(startTimestamp) : null,
    endsAt: new Date(endTimestamp)
  };
}

export function hasAppAccess(user) {
  if (isLocalProBypassEnabled || hasProAccess(user)) {
    return true;
  }

  const trial = getTrialState(user);
  return trial.isKnown ? trial.isActive : true;
}

export function shouldShowLocalProBypass() {
  return isLocalProBypassEnabled;
}
