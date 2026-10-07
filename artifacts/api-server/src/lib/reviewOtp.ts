import { timingSafeEqual } from "node:crypto";

export interface ReviewOtpConfig {
  email?: string;
  otp?: string;
}

export function reviewOtpConfig(): ReviewOtpConfig {
  // No embedded credentials or fallback: absent configuration keeps ordinary OTP.
  return {
    email: process.env["DEMO_REVIEW_EMAIL"],
    otp: process.env["DEMO_REVIEW_OTP"],
  };
}

export function isConfiguredReviewEmail(email: string, config: ReviewOtpConfig): boolean {
  const configuredEmail = config.email?.trim().toLowerCase();
  const configuredOtp = config.otp?.trim();
  return Boolean(
    configuredEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) &&
    configuredOtp &&
    /^\d{6}$/.test(configuredOtp) &&
    email.trim().toLowerCase() === configuredEmail,
  );
}

export function acceptsReviewOtp(email: string, code: string, config: ReviewOtpConfig): boolean {
  if (!isConfiguredReviewEmail(email, config) || !/^\d{6}$/.test(code)) return false;
  return timingSafeEqual(Buffer.from(code), Buffer.from(config.otp!.trim()));
}