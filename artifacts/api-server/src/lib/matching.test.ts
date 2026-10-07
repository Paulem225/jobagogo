import assert from "node:assert/strict";
import test from "node:test";
import type { Job, Profile } from "@workspace/db";
import { compareMatchResults, computeMatchScore } from "./matching";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    name: "Test profile",
    title: "Développeur web",
    skills: ["TypeScript", "React"],
    experienceYears: 4,
    location: "Abidjan",
    remote: true,
    jobTypes: ["CDI"],
    salaryMin: null,
    salaryMax: null,
    bio: null,
    email: null,
    emailVerifiedAt: null,
    linkedin: null,
    phone: null,
    diploma: null,
    lastJobTitle: null,
    profilePhoto: null,
    isPremium: false,
    premiumUntil: null,
    premiumTrialUntil: null,
    notificationsEnabled: true,
    lastProfessionChangeAt: null,
    deviceSecretHash: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    title: "Développeur React",
    company: "Test company",
    logoUrl: null,
    description: "4 ans d'expérience en développement web.",
    location: "Abidjan",
    remote: true,
    skills: ["React", "TypeScript"],
    jobType: "CDI",
    salaryMin: null,
    salaryMax: null,
    source: "test",
    sourceUrl: null,
    dedupeKey: "fallback|||développeur react|||test company|||abidjan|||2026-01-01",
    country: "Côte d'Ivoire",
    postedAt: "2026-01-01",
    experienceYears: 4,
    sector: "Informatique",
    diplomaRequired: null,
    scrapedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("gives a full score to a job matching role, skills, and experience", () => {
  const score = computeMatchScore(makeProfile(), makeJob());

  assert.deepEqual(score, {
    fitScore: 100,
    titleScore: 100,
    skillScore: 100,
    experienceScore: 100,
  });
});

test("penalizes a different role family instead of letting shared skills dominate", () => {
  const score = computeMatchScore(
    makeProfile({ title: "Développeur web", skills: ["Excel"] }),
    makeJob({ title: "Assistant administratif", skills: ["Excel"] }),
  );

  assert.equal(score.titleScore, 0);
  assert.equal(score.skillScore, 100);
  assert.equal(score.fitScore, 40);
});

test("ranks match results by fit score before secondary dimensions", () => {
  const low = {
    job: { id: 1 },
    fitScore: 72,
    titleScore: 100,
    skillScore: 100,
    experienceScore: 0,
  };
  const high = {
    job: { id: 2 },
    fitScore: 91,
    titleScore: 70,
    skillScore: 80,
    experienceScore: 80,
  };

  assert.deepEqual([low, high].sort(compareMatchResults).map((match) => match.job.id), [2, 1]);
});