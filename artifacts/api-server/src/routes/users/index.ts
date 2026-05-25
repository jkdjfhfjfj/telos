import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import { generateTotpSecret, generateQrCode, verifyTotpCode } from "../../lib/totp";
import {
  GetMeResponse,
  SyncUserResponse,
  Setup2faResponse,
  Verify2faBody,
  Enable2faBody,
  Disable2faBody,
} from "@workspace/api-zod";

const router = Router();

// GET /users/me
router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found. Please sync." });
    return;
  }
  res.json(GetMeResponse.parse({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString(),
  }));
});

// POST /users/sync
router.post("/users/sync", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  // Try to fetch clerk user info from the request (headers set by Clerk middleware)
  const clerkEmail = (req.headers["x-clerk-user-email"] as string) ?? "user@telos.net";
  const clerkName = (req.headers["x-clerk-user-name"] as string) ?? undefined;

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId)).limit(1);

  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId: userId,
      email: clerkEmail,
      displayName: clerkName ?? null,
      role: "user",
      status: "active",
      twoFactorEnabled: false,
    }).returning();
    user = created;
  }

  res.json(SyncUserResponse.parse({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString(),
  }));
});

// GET /users/2fa/setup
router.get("/users/2fa/setup", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { secret, otpauthUrl } = generateTotpSecret(user.email);
  // Store temp secret so verify can check it
  await db.update(usersTable).set({ totpSecret: secret }).where(eq(usersTable.id, user.id));
  const qrCodeDataUrl = await generateQrCode(otpauthUrl);

  res.json(Setup2faResponse.parse({ secret, otpauthUrl, qrCodeDataUrl }));
});

// POST /users/2fa/verify
router.post("/users/2fa/verify", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const parsed = Verify2faBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);
  if (!user || !user.totpSecret) { res.status(400).json({ error: "No TOTP secret found. Please setup 2FA first." }); return; }

  const valid = verifyTotpCode(user.totpSecret, parsed.data.code);
  res.json({ valid });
});

// POST /users/2fa/enable
router.post("/users/2fa/enable", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const parsed = Enable2faBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);
  if (!user || !user.totpSecret) { res.status(400).json({ error: "Setup 2FA first" }); return; }

  const valid = verifyTotpCode(user.totpSecret, parsed.data.code);
  if (!valid) { res.status(400).json({ error: "Invalid 2FA code" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ twoFactorEnabled: true })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id, clerkId: updated.clerkId, email: updated.email,
    displayName: updated.displayName, role: updated.role,
    twoFactorEnabled: updated.twoFactorEnabled, createdAt: updated.createdAt.toISOString(),
  });
});

// POST /users/2fa/disable
router.post("/users/2fa/disable", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const parsed = Disable2faBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);
  if (!user || !user.totpSecret) { res.status(400).json({ error: "2FA not set up" }); return; }

  const valid = verifyTotpCode(user.totpSecret, parsed.data.code);
  if (!valid) { res.status(400).json({ error: "Invalid 2FA code" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ twoFactorEnabled: false, totpSecret: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id, clerkId: updated.clerkId, email: updated.email,
    displayName: updated.displayName, role: updated.role,
    twoFactorEnabled: updated.twoFactorEnabled, createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
