import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, walletsTable, withdrawalsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  generateEvmWallet,
  generateTelosZeroAddress,
  generateTelosZeroPrivateKey,
  encryptPrivateKey,
} from "../../lib/crypto";
import {
  CreateWalletBody,
  GetWalletParams,
  GetWalletBalanceParams,
  GetReceiveInfoParams,
} from "@workspace/api-zod";

const router = Router();

function mapWallet(w: typeof walletsTable.$inferSelect) {
  return {
    id: w.id,
    userId: w.userId,
    label: w.label,
    zeroAddress: w.zeroAddress,
    evmAddress: w.evmAddress,
    network: w.network,
    balanceTlos: w.balanceTlos,
    balanceUsd: w.balanceUsd,
    createdAt: w.createdAt.toISOString(),
  };
}

async function getDbUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return user;
}

// GET /wallets
router.get("/wallets", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found. Please sync." }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  res.json(wallets.map(mapWallet));
});

// POST /wallets
router.post("/wallets", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const parsed = CreateWalletBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found. Please sync." }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  const existing = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (existing.length >= 5) { res.status(400).json({ error: "Maximum 5 wallets per user" }); return; }

  const evmWallet = generateEvmWallet();
  const zeroAddress = parsed.data.label
    ? parsed.data.label.toLowerCase().replace(/[^a-z1-5]/g, "").slice(0, 12).padEnd(12, "1")
    : generateTelosZeroAddress();
  const zeroPrivateKey = generateTelosZeroPrivateKey();

  const [wallet] = await db.insert(walletsTable).values({
    userId: user.id,
    label: parsed.data.label,
    zeroAddress,
    evmAddress: evmWallet.address,
    encryptedPrivateKey: encryptPrivateKey(evmWallet.privateKey),
    encryptedZeroPrivateKey: encryptPrivateKey(zeroPrivateKey),
    network: parsed.data.network ?? "mainnet",
    balanceTlos: "0",
    balanceUsd: "0",
  }).returning();

  res.status(201).json({
    ...mapWallet(wallet),
    publicKey: evmWallet.address,
    privateKey: evmWallet.privateKey,
    zeroPublicKey: zeroAddress,
    zeroPrivateKey,
  });
});

// GET /wallets/:walletId
router.get("/wallets/:walletId", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)))
    .limit(1);

  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  res.json(mapWallet(wallet));
});

// GET /wallets/:walletId/balance
router.get("/wallets/:walletId/balance", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  res.json({
    zeroBalance: wallet.balanceTlos,
    evmBalance: wallet.balanceTlos,
    balanceTlos: wallet.balanceTlos,
    balanceUsd: wallet.balanceUsd,
    currency: "TLOS",
    zeroStaked: "0",
    zeroRefunding: "0",
  });
});

// GET /wallets/:walletId/receive
router.get("/wallets/:walletId/receive", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  res.json({
    walletId: wallet.id,
    zeroAddress: wallet.zeroAddress,
    evmAddress: wallet.evmAddress,
    zeroQrData: `telos:${wallet.zeroAddress}`,
    evmQrData: `ethereum:${wallet.evmAddress}@40`,
  });
});

// POST /wallets/:walletId/withdraw
router.post("/wallets/:walletId/withdraw", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const { amount, toAddress, network } = req.body;
  if (!amount || !toAddress) { res.status(400).json({ error: "amount and toAddress are required" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, walletId), eq(walletsTable.userId, user.id)))
    .limit(1);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }

  const balance = parseFloat(wallet.balanceTlos ?? "0");
  const requested = parseFloat(amount);
  if (requested <= 0) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
  if (requested > balance) { res.status(400).json({ error: "Insufficient balance" }); return; }

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId: user.id,
    walletId: wallet.id,
    amount: requested.toFixed(8),
    toAddress,
    network: network ?? "evm",
    status: "pending",
  }).returning();

  res.status(201).json({
    id: withdrawal.id,
    amount: withdrawal.amount,
    toAddress: withdrawal.toAddress,
    network: withdrawal.network,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
  });
});

// GET /wallets/:walletId/withdrawals
router.get("/wallets/:walletId/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const raw = Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId;
  const walletId = parseInt(raw);
  if (isNaN(walletId)) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const withdrawals = await db.select().from(withdrawalsTable)
    .where(and(eq(withdrawalsTable.walletId, walletId), eq(withdrawalsTable.userId, user.id)));

  res.json(withdrawals.map(w => ({
    id: w.id,
    amount: w.amount,
    toAddress: w.toAddress,
    network: w.network,
    status: w.status,
    adminNote: w.adminNote,
    txHash: w.txHash,
    createdAt: w.createdAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
  })));
});

export default router;
