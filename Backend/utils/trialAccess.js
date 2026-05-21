const DEFAULT_TRIAL_DURATION_HOURS = 200;
const HOUR_IN_MS = 60 * 60 * 1000;

const getTrialDurationHours = () => {
  const configuredHours = Number(process.env.APP_TRIAL_DURATION_HOURS || DEFAULT_TRIAL_DURATION_HOURS);
  return Number.isFinite(configuredHours) && configuredHours > 0
    ? configuredHours
    : DEFAULT_TRIAL_DURATION_HOURS;
};

const toSafeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getTrialAccessSnapshot = (libraryCreatedAt) => {
  const startsAt = toSafeDate(libraryCreatedAt);
  const hoursTotal = getTrialDurationHours();

  if (!startsAt) {
    return {
      hoursTotal,
      startsAt: null,
      endsAt: null,
      remainingMs: 0,
      isActive: false
    };
  }

  const endsAt = new Date(startsAt.getTime() + (hoursTotal * HOUR_IN_MS));
  const remainingMs = Math.max(0, endsAt.getTime() - Date.now());

  return {
    hoursTotal,
    startsAt,
    endsAt,
    remainingMs,
    isActive: remainingMs > 0
  };
};

const buildTrialAccessResponse = (libraryCreatedAt) => {
  const trial = getTrialAccessSnapshot(libraryCreatedAt);

  return {
    trialHoursTotal: trial.hoursTotal,
    trialStartsAt: trial.startsAt,
    trialEndsAt: trial.endsAt,
    hasActiveTrial: trial.isActive
  };
};

const hasPaidProAccess = (user) => {
  if (!user || user.subscriptionPlan !== "PRO" || user.subscriptionStatus !== "ACTIVE") {
    return false;
  }

  const renewsAt = toSafeDate(user.subscriptionRenewsAt);
  return !renewsAt || renewsAt.getTime() >= Date.now();
};

const hasAppAccess = (user, libraryCreatedAt) =>
  hasPaidProAccess(user) || getTrialAccessSnapshot(libraryCreatedAt).isActive;

module.exports = {
  buildTrialAccessResponse,
  getTrialAccessSnapshot,
  hasPaidProAccess,
  hasAppAccess
};
