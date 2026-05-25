import { Router } from "express";
import { eq, like, or, desc, count, sum, sql } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import {
  AdminListUsersQueryParams,
  AdminGetUserParams,
  AdminUpdateUserBody,
  AdminListTransactionsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminListUsersQueryParams.safeParse({
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    search: req.query.search as string | undefined,
  });

  const limit = (params.success && params.data.limit) ? params.data.limit : 20;
  const offset = (params.success && params.data.offset) ? params.data.offset : 0;
  const search = params.success ? params.data.search : undefined;

  const baseQuery = db.select().from(usersTable);
  let users;
  if (search) {
    users = await baseQuery
      .where(or(like(usersTable.email, `%${search}%`), like(usersTable.displayName, `%${search}%`)))
      .limit(limit).offset(offset).orderBy(desc(usersTable.createdAt));
  } else {
    users = await baseQuery.limit(limit).offset(offset).orderBy(desc(usersTable.createdAt));
  }

  const [{ value: total }] = await db.select({ value: count() }).from(usersTable);

  res.json({
    users: users.map(u => ({
      id: u.id, clerkId: u.clerkId, email: u.email, displayName: u.displayName,
      role: u.role, twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt.toISOString(),
    })),
    total,
  });
});

// GET /admin/users/:userId
router.get("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, raw)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [walletCount] = await db.select({ value: count() }).from(walletsTable).where(eq(walletsTable.userId, user.id));
  const [txCount] = await db.select({ value: count() }).from(transactionsTable).where(eq(transactionsTable.userId, user.id));

  res.json({
    id: user.id, clerkId: user.clerkId, email: user.email, displayName: user.displayName,
    role: user.role, twoFactorEnabled: user.twoFactorEnabled, status: user.status,
    walletCount: walletCount.value, transactionCount: txCount.value,
    createdAt: user.createdAt.toISOString(),
  });
});

// PATCH /admin/users/:userId
router.patch("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, raw)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const updateData: { role?: "user" | "admin"; status?: "active" | "suspended" } = {};
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.status) updateData.status = parsed.data.status;

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, user.id))
    .returning();

  const [walletCount] = await db.select({ value: count() }).from(walletsTable).where(eq(walletsTable.userId, updated.id));
  const [txCount] = await db.select({ value: count() }).from(transactionsTable).where(eq(transactionsTable.userId, updated.id));

  res.json({
    id: updated.id, clerkId: updated.clerkId, email: updated.email, displayName: updated.displayName,
    role: updated.role, twoFactorEnabled: updated.twoFactorEnabled, status: updated.status,
    walletCount: walletCount.value, transactionCount: txCount.value,
    createdAt: updated.createdAt.toISOString(),
  });
});

// GET /admin/transactions
router.get("/admin/transactions", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminListTransactionsQueryParams.safeParse({
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
  });

  const limit = (params.success && params.data.limit) ? params.data.limit : 50;
  const offset = (params.success && params.data.offset) ? params.data.offset : 0;

  const txs = await db.select().from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit).offset(offset);

  res.json(txs.map(t => ({
    id: t.id, userId: t.userId, walletId: t.walletId,
    fromAddress: t.fromAddress, toAddress: t.toAddress,
    amount: t.amount, currency: t.currency, status: t.status,
    txHash: t.txHash, memo: t.memo, network: t.network,
    blockNumber: t.blockNumber, createdAt: t.createdAt.toISOString(),
  })));
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ value: count() }).from(usersTable);
  const [totalWallets] = await db.select({ value: count() }).from(walletsTable);
  const [totalTransactions] = await db.select({ value: count() }).from(transactionsTable);
  const [pendingTransactions] = await db.select({ value: count() }).from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"));

  // Today's active users (users with transactions today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [activeToday] = await db.select({ value: count() }).from(transactionsTable)
    .where(sql`${transactionsTable.createdAt} >= ${todayStart}`);

  // Total volume
  const volumeResult = await db.select({
    total: sql<string>`COALESCE(SUM(CAST(${transactionsTable.amount} AS DECIMAL)), 0)::text`,
  }).from(transactionsTable).where(eq(transactionsTable.status, "confirmed"));

  res.json({
    totalUsers: totalUsers.value,
    totalWallets: totalWallets.value,
    totalTransactions: totalTransactions.value,
    totalVolume: volumeResult[0]?.total ?? "0",
    activeUsersToday: activeToday.value,
    pendingTransactions: pendingTransactions.value,
  });
});

export default router;
