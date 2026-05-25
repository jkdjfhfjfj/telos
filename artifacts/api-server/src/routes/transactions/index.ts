import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, desc } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import { verifyTotpCode } from "../../lib/totp";
import {
  SendTransactionBody,
  ListTransactionsQueryParams,
  GetTransactionParams,
} from "@workspace/api-zod";

const router = Router();

function mapTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id, userId: t.userId, walletId: t.walletId,
    fromAddress: t.fromAddress, toAddress: t.toAddress,
    amount: t.amount, currency: t.currency, status: t.status,
    txHash: t.txHash, memo: t.memo, network: t.network,
    blockNumber: t.blockNumber, createdAt: t.createdAt.toISOString(),
  };
}

async function getDbUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return user;
}

// GET /transactions
router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const params = ListTransactionsQueryParams.safeParse({
    walletId: req.query.walletId ? parseInt(req.query.walletId as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  });

  const conditions: ReturnType<typeof eq>[] = [eq(transactionsTable.userId, user.id) as ReturnType<typeof eq>];
  if (params.success && params.data.walletId) {
    conditions.push(eq(transactionsTable.walletId, params.data.walletId) as ReturnType<typeof eq>);
  }

  const txs = await db.select().from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(params.success && params.data.limit ? params.data.limit : 50);

  res.json(txs.map(mapTx));
});

// POST /transactions/send  — custodial: deduct from DB balance
router.post("/transactions/send", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const parsed = SendTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  // 2FA check
  if (user.twoFactorEnabled) {
    if (!user.totpSecret) { res.status(400).json({ error: "2FA secret not found" }); return; }
    if (!parsed.data.totpCode) { res.status(400).json({ error: "2FA code is required" }); return; }
    const valid = verifyTotpCode(user.totpSecret, parsed.data.totpCode);
    if (!valid) { res.status(400).json({ error: "Invalid 2FA code" }); return; }
  }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, parsed.data.fromWalletId), eq(walletsTable.userId, user.id)))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const amount = parseFloat(parsed.data.amount);
  const balance = parseFloat(wallet.balanceTlos ?? "0");

  if (amount <= 0) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
  if (amount > balance) { res.status(400).json({ error: `Insufficient balance. Available: ${balance} TLOS` }); return; }

  const newBalance = (balance - amount).toFixed(8);
  await db.update(walletsTable)
    .set({ balanceTlos: newBalance })
    .where(eq(walletsTable.id, wallet.id));

  const network = parsed.data.network ?? "evm";
  const fromAddress = network === "evm" ? wallet.evmAddress : wallet.zeroAddress;
  const fakeTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;

  const [tx] = await db.insert(transactionsTable).values({
    userId: user.id,
    walletId: wallet.id,
    fromAddress,
    toAddress: parsed.data.toAddress,
    amount: parsed.data.amount,
    currency: "TLOS",
    status: "confirmed",
    txHash: fakeTxHash,
    memo: parsed.data.memo ?? null,
    network: network as "zero" | "evm",
  }).returning();

  res.status(201).json(mapTx(tx));
});

// GET /transactions/:txId
router.get("/transactions/:txId", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.txId) ? req.params.txId[0] : req.params.txId;
  const txId = parseInt(raw);
  if (isNaN(txId)) { res.status(400).json({ error: "Invalid transaction ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [tx] = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.id, txId), eq(transactionsTable.userId, user.id)))
    .limit(1);
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }

  res.json(mapTx(tx));
});

export default router;
