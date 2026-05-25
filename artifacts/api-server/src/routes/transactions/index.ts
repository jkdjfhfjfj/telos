import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, desc } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import { decryptPrivateKey, sendEvmTransaction, sendZeroTransaction } from "../../lib/crypto";
import { verifyTotpCode } from "../../lib/totp";
import {
  SendTransactionBody,
  ListTransactionsQueryParams,
  GetTransactionParams,
} from "@workspace/api-zod";

const router = Router();

function mapTx(t: {
  id: number; userId: number; walletId: number; fromAddress: string; toAddress: string;
  amount: string; currency: string; status: string; txHash: string | null; memo: string | null;
  network: string; blockNumber: number | null; createdAt: Date;
}) {
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

  let query = db.select().from(transactionsTable)
    .$dynamic();

  const conditions = [eq(transactionsTable.userId, user.id)];
  if (params.success && params.data.walletId) {
    conditions.push(eq(transactionsTable.walletId, params.data.walletId));
  }

  const txs = await db.select().from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(params.success && params.data.limit ? params.data.limit : 50);

  res.json(txs.map(mapTx));
});

// POST /transactions/send
router.post("/transactions/send", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const parsed = SendTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  // Require 2FA for all sends
  if (user.twoFactorEnabled) {
    if (!user.totpSecret) { res.status(400).json({ error: "2FA secret not found" }); return; }
    const valid = verifyTotpCode(user.totpSecret, parsed.data.totpCode);
    if (!valid) { res.status(400).json({ error: "Invalid 2FA code" }); return; }
  } else {
    // Even without 2FA enabled, require a code attempt (but skip verification if not setup)
    if (!parsed.data.totpCode || parsed.data.totpCode.length !== 6) {
      res.status(400).json({ error: "A 6-digit code is required for transactions. Please enable 2FA in Settings." });
      return;
    }
  }

  // Get wallet
  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, parsed.data.fromWalletId), eq(walletsTable.userId, user.id)))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const amount = parsed.data.amount;
  const toAddress = parsed.data.toAddress;
  const network = parsed.data.network;
  const memo = parsed.data.memo ?? "";

  let txHash: string;
  let fromAddress: string;

  try {
    if (network === "evm") {
      const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);
      txHash = await sendEvmTransaction(privateKey, toAddress, amount, wallet.network);
      fromAddress = wallet.evmAddress;
    } else {
      // Telos Zero
      txHash = await sendZeroTransaction(wallet.zeroAddress, toAddress, amount, memo, wallet.network);
      fromAddress = wallet.zeroAddress;
    }
  } catch (err) {
    req.log.error({ err }, "Transaction send failed");
    res.status(500).json({ error: "Transaction failed. Please check your balance and try again." });
    return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId: user.id,
    walletId: wallet.id,
    fromAddress,
    toAddress,
    amount,
    currency: "TLOS",
    status: "confirmed",
    txHash,
    memo: memo || null,
    network,
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
