import { Router } from "express";
import {
  getExplorerTransactions,
  getExplorerBlocks,
  getNetworkStats,
} from "../../lib/crypto";

const router = Router();

// GET /explorer/transactions
router.get("/explorer/transactions", async (req, res): Promise<void> => {
  const network = (req.query.network as string) ?? "evm";
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const txs = await getExplorerTransactions(network, limit);
  res.json(txs);
});

// GET /explorer/blocks
router.get("/explorer/blocks", async (req, res): Promise<void> => {
  const network = (req.query.network as string) ?? "evm";
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const blocks = await getExplorerBlocks(network, limit);
  res.json(blocks);
});

// GET /explorer/search
router.get("/explorer/search", async (req, res): Promise<void> => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    res.status(400).json({ error: "Search query required" });
    return;
  }

  const trimmed = q.trim();

  // Detect type of query
  if (trimmed.startsWith("0x") && trimmed.length === 66) {
    // EVM transaction hash
    res.json({ type: "transaction", data: { txHash: trimmed, network: "evm" } });
  } else if (trimmed.startsWith("0x") && trimmed.length === 42) {
    // EVM address
    res.json({ type: "address", data: { address: trimmed, network: "evm" } });
  } else if (/^[0-9]+$/.test(trimmed)) {
    // Block number
    res.json({ type: "block", data: { blockNumber: parseInt(trimmed), network: "evm" } });
  } else if (/^[a-z1-5]{12}$/.test(trimmed)) {
    // Telos Zero account (12 chars, a-z1-5)
    res.json({ type: "address", data: { address: trimmed, network: "zero" } });
  } else if (trimmed.length === 64) {
    // Telos Zero transaction hash
    res.json({ type: "transaction", data: { txHash: trimmed, network: "zero" } });
  } else {
    res.json({ type: "notfound", data: {} });
  }
});

// GET /explorer/stats
router.get("/explorer/stats", async (req, res): Promise<void> => {
  const stats = await getNetworkStats();
  res.json(stats);
});

export default router;
