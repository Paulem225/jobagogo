import { Router, type IRouter, type Request } from "express";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  min,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import {
  authSessionsTable,
  cvDocumentsTable,
  db,
  jobsTable,
  professionChangePaymentsTable,
  premiumPaymentsTable,
  profilesTable,
  savedJobsTable,
} from "@workspace/db";
import { SendAdminNotificationBody } from "@workspace/api-zod";
import type { SQL } from "drizzle-orm";
import { requireAdmin } from "../middleware/admin";
import { sendManualPushNotification } from "../lib/pushNotifications";

const router: IRouter = Router();
router.use(requireAdmin);

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const PLACEHOLDER_PROFILE_NAME = "Nouveau candidat";

class InvalidFilterError extends Error {}

function queryValue(req: Request, name: string): string | undefined {
  const value = req.query[name];
  if (Array.isArray(value)) return undefined;
  return typeof value === "string" ? value.trim() : undefined;
}

function positiveInteger(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) {
    throw new InvalidFilterError(`${name} doit être un entier positif.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new InvalidFilterError(`${name} doit être un entier positif.`);
  }
  return parsed;
}

function optionalDate(value: string | undefined, name: string): Date | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidFilterError(`${name} doit être une date ISO valide.`);
  }
  return parsed;
}

function activePremiumCondition(now: Date): SQL {
  return and(
    eq(profilesTable.isPremium, true),
    or(isNull(profilesTable.premiumUntil), gt(profilesTable.premiumUntil, now)),
  )!;
}

function inactivePremiumCondition(now: Date): SQL {
  return or(
    eq(profilesTable.isPremium, false),
    lte(profilesTable.premiumUntil, now),
  )!;
}

function adminProfileJson(
  profile: typeof profilesTable.$inferSelect,
  registeredAt: Date | null = null,
) {
  const isPremium = Boolean(
    profile.isPremium &&
      (!profile.premiumUntil || profile.premiumUntil.getTime() > Date.now()),
  );

  return {
    id: profile.id,
    email: profile.email,
    emailVerifiedAt: profile.emailVerifiedAt?.toISOString() ?? null,
    name: profile.name,
    title: profile.title,
    skills: profile.skills,
    experienceYears: profile.experienceYears,
    location: profile.location,
    remote: profile.remote,
    jobTypes: profile.jobTypes,
    salaryMin: profile.salaryMin,
    salaryMax: profile.salaryMax,
    bio: profile.bio,
    linkedin: profile.linkedin,
    phone: profile.phone,
    diploma: profile.diploma,
    lastJobTitle: profile.lastJobTitle,
    profilePhoto: profile.profilePhoto,
    notificationsEnabled: profile.notificationsEnabled,
    isPremium,
    premiumUntil: profile.premiumUntil?.toISOString() ?? null,
    lastProfessionChangeAt: profile.lastProfessionChangeAt?.toISOString() ?? null,
    registeredAt: registeredAt?.toISOString() ?? null,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function adminUserSummaryJson(
  profile: {
    id: number;
    email: string | null;
    emailVerifiedAt: Date | null;
    name: string;
    title: string | null;
    experienceYears: number;
    location: string;
    isPremium: boolean;
    premiumUntil: Date | null;
    updatedAt: Date;
  },
  registeredAt: Date | null,
) {
  const isPremium = Boolean(
    profile.isPremium &&
      (!profile.premiumUntil || profile.premiumUntil.getTime() > Date.now()),
  );

  return {
    id: profile.id,
    email: profile.email,
    emailVerifiedAt: profile.emailVerifiedAt?.toISOString() ?? null,
    name: profile.name,
    title: profile.title,
    experienceYears: profile.experienceYears,
    location: profile.location,
    isPremium,
    premiumUntil: profile.premiumUntil?.toISOString() ?? null,
    registeredAt: registeredAt?.toISOString() ?? null,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function cvJson(cv: typeof cvDocumentsTable.$inferSelect) {
  return {
    id: cv.id,
    fileName: cv.fileName,
    mimeType: cv.mimeType,
    fileSize: cv.fileSize,
    status: cv.status,
    extractedText: cv.extractedText,
    analysis: cv.analysis,
    errorMessage: cv.errorMessage,
    createdAt: cv.createdAt.toISOString(),
    updatedAt: cv.updatedAt.toISOString(),
  };
}

function paymentJson(payment: typeof premiumPaymentsTable.$inferSelect) {
  return {
    id: payment.id,
    plan: payment.plan,
    amount: payment.amount,
    status: payment.status,
    purchaseReference: payment.purchaseReference,
    paymentLinkExpiresAt: payment.paymentLinkExpiresAt?.toISOString() ?? null,
    premiumUntil: payment.premiumUntil?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function professionPaymentJson(
  payment: typeof professionChangePaymentsTable.$inferSelect,
) {
  return {
    id: payment.id,
    requestedTitle: payment.requestedTitle,
    amount: payment.amount,
    status: payment.status,
    purchaseReference: payment.purchaseReference,
    paymentLinkExpiresAt: payment.paymentLinkExpiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function jobJson(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    logoUrl: job.logoUrl,
    location: job.location,
    remote: job.remote,
    skills: job.skills,
    jobType: job.jobType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    source: job.source,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt,
    experienceYears: job.experienceYears,
    sector: job.sector,
    diplomaRequired: job.diplomaRequired,
  };
}

function listFilters(req: Request): {
  conditions: SQL[];
  page: number;
  pageSize: number;
} {
  const now = new Date();
  const conditions: SQL[] = [];
  const email = queryValue(req, "email");
  const city = queryValue(req, "city") ?? queryValue(req, "location");
  const profession = queryValue(req, "profession") ?? queryValue(req, "title");
  const search = queryValue(req, "search") ?? queryValue(req, "q");
  const premium =
    queryValue(req, "premiumStatus") ??
    queryValue(req, "premium") ??
    queryValue(req, "isPremium");

  if (email) conditions.push(ilike(profilesTable.email, `%${email}%`));
  if (city) conditions.push(ilike(profilesTable.location, `%${city}%`));
  if (profession) {
    conditions.push(
      or(
        ilike(profilesTable.title, `%${profession}%`),
        ilike(profilesTable.lastJobTitle, `%${profession}%`),
      )!,
    );
  }
  if (search) {
    conditions.push(
      or(
        ilike(profilesTable.email, `%${search}%`),
        ilike(profilesTable.name, `%${search}%`),
        ilike(profilesTable.location, `%${search}%`),
        ilike(profilesTable.title, `%${search}%`),
      )!,
    );
  }

  if (premium && !["all"].includes(premium.toLowerCase())) {
    if (["true", "1", "active"].includes(premium.toLowerCase())) {
      conditions.push(activePremiumCondition(now));
    } else if (["false", "0", "inactive"].includes(premium.toLowerCase())) {
      conditions.push(inactivePremiumCondition(now));
    } else {
      throw new InvalidFilterError(
        "premiumStatus doit valoir all, active, inactive, true ou false.",
      );
    }
  }

  const registeredFrom =
    optionalDate(queryValue(req, "registeredFrom") ?? queryValue(req, "createdFrom"), "registeredFrom");
  const registeredTo =
    optionalDate(queryValue(req, "registeredTo") ?? queryValue(req, "createdTo"), "registeredTo");
  const updatedFrom = optionalDate(queryValue(req, "updatedFrom"), "updatedFrom");
  const updatedTo = optionalDate(queryValue(req, "updatedTo"), "updatedTo");

  if (registeredFrom) {
    conditions.push(
      sql`(
        SELECT min(${authSessionsTable.createdAt})
        FROM ${authSessionsTable}
        WHERE ${authSessionsTable.profileId} = ${profilesTable.id}
      ) >= ${registeredFrom}`,
    );
  }
  if (registeredTo) {
    conditions.push(
      sql`(
        SELECT min(${authSessionsTable.createdAt})
        FROM ${authSessionsTable}
        WHERE ${authSessionsTable.profileId} = ${profilesTable.id}
      ) <= ${registeredTo}`,
    );
  }
  if (updatedFrom) conditions.push(gte(profilesTable.updatedAt, updatedFrom));
  if (updatedTo) conditions.push(lte(profilesTable.updatedAt, updatedTo));

  const page = positiveInteger(queryValue(req, "page"), "page", 1);
  const pageSize = Math.min(
    positiveInteger(
      queryValue(req, "pageSize") ?? queryValue(req, "limit"),
      "pageSize",
      DEFAULT_PAGE_SIZE,
    ),
    MAX_PAGE_SIZE,
  );

  return { conditions, page, pageSize };
}

async function registeredAtForProfiles(profileIds: number[]): Promise<Map<number, Date>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db
    .select({
      profileId: authSessionsTable.profileId,
      registeredAt: min(authSessionsTable.createdAt),
    })
    .from(authSessionsTable)
    .where(inArray(authSessionsTable.profileId, profileIds))
    .groupBy(authSessionsTable.profileId);

  return new Map(
    rows
      .filter((row): row is { profileId: number; registeredAt: Date } => row.registeredAt !== null)
      .map((row) => [row.profileId, row.registeredAt]),
  );
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const [profile] = await db
    .select({
      id: profilesTable.id,
      email: profilesTable.email,
      name: profilesTable.name,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);

  if (!profile) {
    res.status(401).json({
      error: "Session administrateur invalide.",
      code: "ADMIN_AUTH_REQUIRED",
    });
    return;
  }

  res.json({
    authenticated: true,
    role: "admin",
    permissions: ["admin:read"],
    user: profile,
  });
});

router.post("/notifications", async (req, res): Promise<void> => {
  const parsed = SendAdminNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.message,
      code: "INVALID_NOTIFICATION",
    });
    return;
  }

  try {
    const result = await sendManualPushNotification(parsed.data);
    res.json({
      sent: true,
      deliveryStatus: "accepted",
      ...result,
    });
  } catch (error) {
    req.log.error({ err: error }, "Admin manual push notification failed");
    res.status(502).json({
      error: error instanceof Error
        ? error.message
        : "La notification administrateur n’a pas pu être envoyée.",
      code: "ADMIN_NOTIFICATION_SEND_FAILED",
    });
  }
});

router.get("/users", async (req, res): Promise<void> => {
  let filters: ReturnType<typeof listFilters>;
  try {
    filters = listFilters(req);
  } catch (error) {
    if (error instanceof InvalidFilterError) {
      res.status(400).json({ error: error.message, code: "INVALID_FILTER" });
      return;
    }
    throw error;
  }

  const where = filters.conditions.length > 0 ? and(...filters.conditions) : undefined;
  const [{ total }] = await db
    .select({ total: countDistinct(profilesTable.id) })
    .from(profilesTable)
    .where(where);
  const profiles = await db
    .select({
      id: profilesTable.id,
      email: profilesTable.email,
      emailVerifiedAt: profilesTable.emailVerifiedAt,
      name: profilesTable.name,
      title: profilesTable.title,
      experienceYears: profilesTable.experienceYears,
      location: profilesTable.location,
      isPremium: profilesTable.isPremium,
      premiumUntil: profilesTable.premiumUntil,
      updatedAt: profilesTable.updatedAt,
    })
    .from(profilesTable)
    .where(where)
    .orderBy(desc(profilesTable.updatedAt), desc(profilesTable.id))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  const registeredAt = await registeredAtForProfiles(profiles.map((profile) => profile.id));
  const users = profiles.map((profile) =>
    adminUserSummaryJson(profile, registeredAt.get(profile.id) ?? null),
  );
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);

  res.json({
    users,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1 && totalPages > 0,
    },
  });
});

router.get("/users/:profileId", async (req, res): Promise<void> => {
  const profileId = Number(req.params.profileId);
  if (!Number.isSafeInteger(profileId) || profileId < 1) {
    res.status(400).json({ error: "Identifiant utilisateur invalide.", code: "INVALID_USER_ID" });
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Utilisateur introuvable.", code: "USER_NOT_FOUND" });
    return;
  }

  const [
    registeredRows,
    cvs,
    savedRows,
    sessions,
    premiumPayments,
    professionPayments,
  ] = await Promise.all([
    db
      .select({ registeredAt: min(authSessionsTable.createdAt) })
      .from(authSessionsTable)
      .where(eq(authSessionsTable.profileId, profileId)),
    db
      .select()
      .from(cvDocumentsTable)
      .where(eq(cvDocumentsTable.profileId, profileId))
      .orderBy(desc(cvDocumentsTable.updatedAt)),
    db
      .select({
        id: savedJobsTable.id,
        savedAt: savedJobsTable.savedAt,
        job: jobsTable,
      })
      .from(savedJobsTable)
      .leftJoin(jobsTable, eq(savedJobsTable.jobId, jobsTable.id))
      .where(eq(savedJobsTable.profileId, profileId))
      .orderBy(desc(savedJobsTable.savedAt)),
    db
      .select({
        id: authSessionsTable.id,
        isDemo: authSessionsTable.isDemo,
        expiresAt: authSessionsTable.expiresAt,
        revokedAt: authSessionsTable.revokedAt,
        createdAt: authSessionsTable.createdAt,
      })
      .from(authSessionsTable)
      .where(eq(authSessionsTable.profileId, profileId))
      .orderBy(desc(authSessionsTable.createdAt))
      .limit(50),
    db
      .select()
      .from(premiumPaymentsTable)
      .where(eq(premiumPaymentsTable.profileId, profileId))
      .orderBy(desc(premiumPaymentsTable.createdAt)),
    db
      .select()
      .from(professionChangePaymentsTable)
      .where(eq(professionChangePaymentsTable.profileId, profileId))
      .orderBy(desc(professionChangePaymentsTable.createdAt)),
  ]);

  const registeredAt = registeredRows[0]?.registeredAt ?? null;
  const favoriteActivity = savedRows[0]?.savedAt ?? null;
  const cvActivity = cvs[0]?.updatedAt ?? null;
  const lastSessionAt = sessions[0]?.createdAt ?? null;

  res.json({
    profile: adminProfileJson(profile, registeredAt),
    cvs: cvs.map(cvJson),
    favorites: savedRows.map((saved) => ({
      id: saved.id,
      savedAt: saved.savedAt.toISOString(),
      job: saved.job ? jobJson(saved.job) : null,
    })),
    activity: {
      sessions,
      lastSessionAt: lastSessionAt?.toISOString() ?? null,
      latestCvAt: cvActivity?.toISOString() ?? null,
      latestFavoriteAt: favoriteActivity?.toISOString() ?? null,
    },
    payments: {
      premium: premiumPayments.map(paymentJson),
      professionChanges: professionPayments.map(professionPaymentJson),
    },
  });
});

router.get("/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const premiumActive = activePremiumCondition(now);
  const completedProfile = sql`
    btrim(${profilesTable.name}) <> '' AND
    btrim(${profilesTable.name}) <> ${PLACEHOLDER_PROFILE_NAME} AND
    btrim(coalesce(${profilesTable.title}, '')) <> '' AND
    btrim(${profilesTable.location}) <> ''
  `;
  const analyzedCv = or(
    eq(cvDocumentsTable.status, "completed"),
    isNotNull(cvDocumentsTable.analysis),
  )!;
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ totalUsers }],
    [{ completedProfiles }],
    [{ analyzedCvs }],
    [{ totalFavorites }],
    [{ premiumUsers }],
    [{ newUsersLast30Days }],
    [{ premiumTotal }],
    [{ premiumCompleted }],
    [{ premiumPending }],
    [{ premiumFailed }],
    [{ premiumRevenue }],
    [{ professionTotal }],
    [{ professionCompleted }],
    [{ professionPending }],
    [{ professionFailed }],
    [{ professionRevenue }],
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(profilesTable),
    db.select({ completedProfiles: count() }).from(profilesTable).where(completedProfile),
    db.select({ analyzedCvs: count() }).from(cvDocumentsTable).where(analyzedCv),
    db.select({ totalFavorites: count() }).from(savedJobsTable),
    db.select({ premiumUsers: count() }).from(profilesTable).where(premiumActive),
    db
      .select({ newUsersLast30Days: countDistinct(authSessionsTable.profileId) })
      .from(authSessionsTable)
      .where(gte(authSessionsTable.createdAt, last30Days)),
    db.select({ premiumTotal: count() }).from(premiumPaymentsTable),
    db.select({ premiumCompleted: count() }).from(premiumPaymentsTable)
      .where(eq(premiumPaymentsTable.status, "completed")),
    db.select({ premiumPending: count() }).from(premiumPaymentsTable)
      .where(eq(premiumPaymentsTable.status, "pending")),
    db.select({ premiumFailed: count() }).from(premiumPaymentsTable)
      .where(eq(premiumPaymentsTable.status, "failed")),
    db.select({ premiumRevenue: sum(premiumPaymentsTable.amount) }).from(premiumPaymentsTable)
      .where(eq(premiumPaymentsTable.status, "completed")),
    db.select({ professionTotal: count() }).from(professionChangePaymentsTable),
    db.select({ professionCompleted: count() }).from(professionChangePaymentsTable)
      .where(eq(professionChangePaymentsTable.status, "completed")),
    db.select({ professionPending: count() }).from(professionChangePaymentsTable)
      .where(eq(professionChangePaymentsTable.status, "pending")),
    db.select({ professionFailed: count() }).from(professionChangePaymentsTable)
      .where(eq(professionChangePaymentsTable.status, "failed")),
    db.select({ professionRevenue: sum(professionChangePaymentsTable.amount) }).from(professionChangePaymentsTable)
      .where(eq(professionChangePaymentsTable.status, "completed")),
  ]);

  const premiumRevenueAmount = Number(premiumRevenue ?? 0);
  const professionRevenueAmount = Number(professionRevenue ?? 0);

  res.json({
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      newLast30Days: newUsersLast30Days,
      profilesCompleted: completedProfiles,
      premiumActive: premiumUsers,
    },
    cvs: {
      analyzed: analyzedCvs,
    },
    favorites: {
      total: totalFavorites,
    },
    payments: {
      total: premiumTotal + professionTotal,
      completed: premiumCompleted + professionCompleted,
      pending: premiumPending + professionPending,
      failed: premiumFailed + professionFailed,
      completedAmount: premiumRevenueAmount + professionRevenueAmount,
      currency: "XOF",
      premium: {
        total: premiumTotal,
        completed: premiumCompleted,
        pending: premiumPending,
        failed: premiumFailed,
        completedAmount: premiumRevenueAmount,
      },
      professionChanges: {
        total: professionTotal,
        completed: professionCompleted,
        pending: professionPending,
        failed: professionFailed,
        completedAmount: professionRevenueAmount,
      },
    },
  });
});

export default router;
