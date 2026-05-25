import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, walletsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  generateEvmWallet,
  generateTelosZeroAddress,
  generateTelosZeroPrivateKey,
  encryptPrivateKey,
  decryptPrivateKey,
  getEvmBalance,
  getZeroBalance,
} from "../../lib/crypto";
import {
  CreateWalletBody,
  GetWalletParams,
  GetWalletBalanceParams,
  GetReceiveInfoParams,
} from "@workspace/api-zod";

const router = Router();

function mapWallet(w: { id: number; userId: number; label: string; zeroAddress: string; evmAddress: string; network: string; createdAt: Date }) {
  return {
    id: w.id,
    userId: w.userId,
    label: w.label,
    zeroAddress: w.zeroAddress,
    evmAddress: w.evmAddress,
    network: w.network,
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

  // Check wallet limit (max 5 per user)
  const existing = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (existing.length >= 5) { res.status(400).json({ error: "Maximum 5 wallets per user" }); return; }

  // Generate EVM wallet
  const evmWallet = generateEvmWallet();
  // Generate Telos Zero address (12 chars)
  const zeroAddress = generateTelosZeroAddress();
  const zeroPrivateKey = generateTelosZeroPrivateKey();

  const [wallet] = await db.insert(walletsTable).values({
    userId: user.id,
    label: parsed.data.label,
    zeroAddress,
    evmAddress: evmWallet.address,
    encryptedPrivateKey: encryptPrivateKey(evmWallet.privateKey),
    encryptedZeroPrivateKey: encryptPrivateKey(zeroPrivateKey),
    network: parsed.data.network ?? "mainnet",
  }).returning();

  res.status(201).json(mapWallet(wallet));
});

// GET /wallets/:walletId
router.get("/wallets/:walletId", requireAuth, async (req, res): Promise<void> => {
  const { userId: clerkId } = getAuth(req);
  const params = GetWalletParams.safeParse({ walletId: parseInt(Array.isArray(req.params.walletId) ? req.params.walletId[0] : req.params.walletId) });
  if (!params.success) { res.status(400).json({ error: "Invalid wallet ID" }); return; }

  const user = await getDbUser(clerkId!);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [wallet] = await db.select().from(walletsTable)
    .where(and(eq(walletsTable.id, params.data.walletId), eq(walletsTable.userId, user.id)))
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

  const [evmBalance, zeroData] = await Promise.all([
    getEvmBalance(wallet.evmAddress, wallet.network),
    getZeroBalance(wallet.zeroAddress, wallet.network),
  ]);

  res.json({
    zeroBalance: zeroData.liquid,
    evmBalance,
    currency: "TLOS",
    zeroStaked: zeroData.staked,
    zeroRefunding: zeroData.refunding,
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

export default router;
