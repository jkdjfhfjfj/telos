import { Router } from "express";
import { eq, like, or, desc, count, sql } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable, withdrawalsTable } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import {
  AdminListUsersQueryParams,
  AdminUpdateUserBody,
  AdminListTransactionsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ value: count() }).from(usersTable);
  const [totalWallets] = await db.select({ value: count() }).from(walletsTable);
  const [totalTransactions] = await db.select({ value: count() }).from(transactionsTable);
  const [pendingTransactions] = await db.select({ value: count() }).from(transactionsTable)
    .where(eq(transactionsTable.status, "pending"));
  const [pendingWithdrawals] = await db.select({ value: count() }).from(withdrawalsTable)
    .where(eq(withdrawalsTable.status, "pending"));

  const volumeResult = await db.select({
    total: sql<string>`COALESCE(SUM(CAST(${transactionsTable.amount} AS DECIMAL)), 0)::text`,
  }).from(transactionsTable).where(eq(transactionsTable.status, "confirmed"));

  res.json({
    totalUsers: totalUsers.value,
    totalWallets: totalWallets.value,
    totalTransactions: totalTransactions.value,
    totalVolume: volumeResult[0]?.total ?? "0",
    activeUsersToday: 0,
    pendingTransactions: pendingTransactions.value,
    pendingWithdrawals: pendingWithdrawals.value,
  });
});

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

  let users;
  if (search) {
    users = await db.select().from(usersTable)
      .where(or(like(usersTable.email, `%${search}%`), like(usersTable.displayName, `%${search}%`)))
      .limit(limit).offset(offset).orderBy(desc(usersTable.createdAt));
  } else {
    users = await db.select().from(usersTable)
      .limit(limit).offset(offset).orderBy(desc(usersTable.createdAt));
  }

  const [{ value: total }] = await db.select({ value: count() }).from(usersTable);

  res.json({
    users: users.map(u => ({
      id: u.id, clerkId: u.clerkId, email: u.email, displayName: u.displayName,
      role: u.role, status: u.status, twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt.toISOString(),
    })),
    total,
  });
});

// GET /admin/users/:userId
router.get("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, raw)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const userWallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  const [txCount] = await db.select({ value: count() }).from(transactionsTable).where(eq(transactionsTable.userId, user.id));

  res.json({
    id: user.id, clerkId: user.clerkId, email: user.email, displayName: user.displayName,
    role: user.role, twoFactorEnabled: user.twoFactorEnabled, status: user.status,
    walletCount: userWallets.length, transactionCount: txCount.value,
    createdAt: user.createdAt.toISOString(),
    wallets: userWallets.map(w => ({
      id: w.id, label: w.label, zeroAddress: w.zeroAddress, evmAddress: w.evmAddress,
      network: w.network, balanceTlos: w.balanceTlos, balanceUsd: w.balanceUsd,
      createdAt: w.createdAt.toISOString(),
    })),
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

  const userWallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, updated.id));
  const [txCount] = await db.select({ value: count() }).from(transactionsTable).where(eq(transactionsTable.userId, updated.id));

  res.json({
    id: updated.id, clerkId: updated.clerkId, email: updated.email, displayName: updated.displayName,
    role: updated.role, twoFactorEnabled: updated.twoFactorEnabled, status: updated.status,
    walletCount: userWallets.length, transactionCount: txCount.value,
    createdAt: updated.createdAt.toISOString(),
  });
});

// GET /admin/wallets — all wallets across all users
router.get("/admin/wallets", requireAdmin, async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  const allWallets = await db.select({
    wallet: walletsTable,
    user: { email: usersTable.email, displayName: usersTable.displayName, clerkId: usersTable.clerkId },
  })
    .from(walletsTable)
    .leftJoin(usersTable, eq(walletsTable.userId, usersTable.id))
    .orderBy(desc(walletsTable.createdAt))
    .limit(limit).offset(offset);

  const [{ value: total }] = await db.select({ value: count() }).from(walletsTable);

  res.json({
    wallets: allWallets.map(({ wallet: w, user: u }) => ({
      id: w.id, userId: w.userId, label: w.label,
      zeroAddress: w.zeroAddress, evmAddress: w.evmAddress,
      network: w.network, balanceTlos: w.balanceTlos, balanceUsd: w.balanceUsd,
      createdAt: w.createdAt.toISOString(),
      userEmail: u?.email ?? null,
      userDisplayName: u?.displayName ?? null,
      userClerkId: u?.clerkId ?? null,
    })),
    total,
  });
});

// PATCH /admin/wallets/:walletId/balance — admin sets wallet balance
router.patch("/admin/wallets/:walletId/balance", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const { balanceTlos, balanceUsd, note } = req.body;
  if (balanceTlos === undefined && balanceUsd === undefined) {
    res.status(400).json({ error: "balanceTlos or balanceUsd is required" }); return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, walletId)).limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const updateData: { balanceTlos?: string; balanceUsd?: string } = {};
  if (balanceTlos !== undefined) updateData.balanceTlos = parseFloat(balanceTlos).toFixed(8);
  if (balanceUsd !== undefined) updateData.balanceUsd = parseFloat(balanceUsd).toFixed(2);

  const [updated] = await db.update(walletsTable)
    .set(updateData)
    .where(eq(walletsTable.id, walletId))
    .returning();

  // Record as a credit transaction for audit trail
  if (balanceTlos !== undefined) {
    const diff = parseFloat(balanceTlos) - parseFloat(wallet.balanceTlos ?? "0");
    if (diff !== 0) {
      await db.insert(transactionsTable).values({
        userId: wallet.userId,
        walletId: wallet.id,
        fromAddress: "admin",
        toAddress: updated.evmAddress,
        amount: Math.abs(diff).toFixed(8),
        currency: "TLOS",
        status: "confirmed",
        txHash: `admin-${Date.now()}`,
        memo: note ? `Admin balance update: ${note}` : `Admin balance adjustment`,
        network: "evm",
      });
    }
  }

  res.json({
    id: updated.id, label: updated.label,
    balanceTlos: updated.balanceTlos, balanceUsd: updated.balanceUsd,
    zeroAddress: updated.zeroAddress, evmAddress: updated.evmAddress,
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

  const txs = await db.select({
    tx: transactionsTable,
    user: { email: usersTable.email, displayName: usersTable.displayName },
  })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit).offset(offset);

  const [{ value: total }] = await db.select({ value: count() }).from(transactionsTable);

  res.json({
    transactions: txs.map(({ tx: t, user: u }) => ({
      id: t.id, userId: t.userId, walletId: t.walletId,
      fromAddress: t.fromAddress, toAddress: t.toAddress,
      amount: t.amount, currency: t.currency, status: t.status,
      txHash: t.txHash, memo: t.memo, network: t.network,
      blockNumber: t.blockNumber, createdAt: t.createdAt.toISOString(),
      userEmail: u?.email ?? null,
      userDisplayName: u?.displayName ?? null,
    })),
    total,
  });
});

// GET /admin/withdrawals
router.get("/admin/withdrawals", requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  let query = db.select({
    withdrawal: withdrawalsTable,
    user: { email: usersTable.email, displayName: usersTable.displayName, clerkId: usersTable.clerkId },
    wallet: { label: walletsTable.label, zeroAddress: walletsTable.zeroAddress, evmAddress: walletsTable.evmAddress },
  })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .leftJoin(walletsTable, eq(withdrawalsTable.walletId, walletsTable.id))
    .$dynamic();

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query = query.where(eq(withdrawalsTable.status, status as "pending" | "approved" | "rejected"));
  }

  const rows = await query.orderBy(desc(withdrawalsTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(withdrawalsTable);

  res.json({
    withdrawals: rows.map(({ withdrawal: w, user: u, wallet: wl }) => ({
      id: w.id, userId: w.userId, walletId: w.walletId,
      amount: w.amount, toAddress: w.toAddress, network: w.network,
      status: w.status, adminNote: w.adminNote, txHash: w.txHash,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString() ?? null,
      userEmail: u?.email ?? null,
      userDisplayName: u?.displayName ?? null,
      walletLabel: wl?.label ?? null,
      walletZeroAddress: wl?.zeroAddress ?? null,
      walletEvmAddress: wl?.evmAddress ?? null,
    })),
    total,
  });
});

// PATCH /admin/withdrawals/:id  — approve or reject
router.patch("/admin/withdrawals/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid withdrawal ID" }); return; }

  const { action, adminNote } = req.body;
  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" }); return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  if (withdrawal.status !== "pending") {
    res.status(400).json({ error: `Withdrawal is already ${withdrawal.status}` }); return;
  }

  if (action === "approve") {
    // Check balance
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, withdrawal.walletId)).limit(1);
    if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

    const balance = parseFloat(wallet.balanceTlos ?? "0");
    const amount = parseFloat(withdrawal.amount);
    if (amount > balance) {
      res.status(400).json({ error: `Insufficient wallet balance (${balance} TLOS) to approve ${amount} TLOS withdrawal` });
      return;
    }

    const newBalance = (balance - amount).toFixed(8);
    await db.update(walletsTable).set({ balanceTlos: newBalance }).where(eq(walletsTable.id, wallet.id));

    const fakeTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;

    // Record confirmed transaction
    await db.insert(transactionsTable).values({
      userId: withdrawal.userId,
      walletId: withdrawal.walletId,
      fromAddress: withdrawal.network === "evm" ? wallet.evmAddress : wallet.zeroAddress,
      toAddress: withdrawal.toAddress,
      amount: withdrawal.amount,
      currency: "TLOS",
      status: "confirmed",
      txHash: fakeTxHash,
      memo: "Withdrawal approved by admin",
      network: withdrawal.network as "zero" | "evm",
    });

    const [updated] = await db.update(withdrawalsTable)
      .set({ status: "approved", adminNote: adminNote ?? null, txHash: fakeTxHash, processedAt: new Date() })
      .where(eq(withdrawalsTable.id, id))
      .returning();

    res.json({ id: updated.id, status: updated.status, txHash: updated.txHash, adminNote: updated.adminNote });
  } else {
    const [updated] = await db.update(withdrawalsTable)
      .set({ status: "rejected", adminNote: adminNote ?? null, processedAt: new Date() })
      .where(eq(withdrawalsTable.id, id))
      .returning();

    res.json({ id: updated.id, status: updated.status, adminNote: updated.adminNote });
  }
});

export default router;
