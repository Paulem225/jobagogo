const PREMIUM_TRIAL_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type PremiumTrialProfile = {
  isPremium: boolean;
  premiumUntil: Date | null;
  premiumTrialUntil: Date | null;
};

export type PremiumTrialGrant = {
  isPremium: true;
  premiumUntil: Date;
  premiumTrialUntil: Date;
};

export function createPremiumTrial(now = new Date()): PremiumTrialGrant {
  const premiumTrialUntil = new Date(now.getTime() + PREMIUM_TRIAL_DAYS * MILLISECONDS_PER_DAY);
  return {
    isPremium: true,
    premiumUntil: premiumTrialUntil,
    premiumTrialUntil,
  };
}

export function getPremiumTrialStatus(
  profile: PremiumTrialProfile,
  now = new Date(),
): {
  isPremium: boolean;
  isPremiumTrial: boolean;
  isPremiumTrialExpired: boolean;
} {
  const isPremium =
    profile.isPremium &&
    (!profile.premiumUntil || profile.premiumUntil.getTime() > now.getTime());
  const expiryMatchesTrial =
    profile.premiumUntil !== null &&
    profile.premiumTrialUntil !== null &&
    profile.premiumUntil.getTime() === profile.premiumTrialUntil.getTime();
  const trialHasEnded =
    profile.premiumTrialUntil !== null &&
    profile.premiumTrialUntil.getTime() <= now.getTime();

  return {
    isPremium,
    isPremiumTrial: isPremium && expiryMatchesTrial && !trialHasEnded,
    isPremiumTrialExpired: !isPremium && expiryMatchesTrial && trialHasEnded,
  };
}