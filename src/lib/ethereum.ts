import {
  createPublicClient,
  formatEther,
  formatUnits,
  getAddress,
  hexToBigInt,
  http,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";

export type EthereumLog = {
  address: string;
  data: string;
  topics: readonly string[];
  logIndex: number | null;
};

export type Erc20Transfer = {
  tokenAddress: Address;
  from: Address;
  to: Address;
  valueRaw: string;
  logIndex: number | null;
};

export type TransactionDetails = {
  hash: Hex;
  from: Address;
  to: Address | null;
  valueEth: string;
  valueWei: string;
  blockNumber: string | null;
  status: "pending" | "success" | "reverted";
  gasUsed: string | null;
  gasPriceGwei: string | null;
  logs: {
    address: Address;
    topics: readonly Hex[];
    data: Hex;
    logIndex: number | null;
  }[];
  erc20Transfers: Erc20Transfer[];
};

export class EthereumInspectionError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "WRONG_NETWORK" | "RPC_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "EthereumInspectionError";
  }
}

const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function isTransactionHash(value: string): value is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function decodeErc20Transfers(logs: readonly EthereumLog[]): Erc20Transfer[] {
  const transfers: Erc20Transfer[] = [];

  for (const log of logs) {
    if (
      log.topics.length !== 3 ||
      log.topics[0]?.toLowerCase() !== transferTopic ||
      !/^0x0{24}[0-9a-fA-F]{40}$/.test(log.topics[1] ?? "") ||
      !/^0x0{24}[0-9a-fA-F]{40}$/.test(log.topics[2] ?? "") ||
      !/^0x[0-9a-fA-F]{64}$/.test(log.data)
    ) {
      continue;
    }

    try {
      transfers.push({
        tokenAddress: getAddress(log.address as Address),
        from: getAddress(`0x${log.topics[1].slice(26)}`),
        to: getAddress(`0x${log.topics[2].slice(26)}`),
        valueRaw: hexToBigInt(log.data as Hex).toString(),
        logIndex: log.logIndex,
      });
    } catch {
      // A malformed emitter must not prevent inspection of the transaction.
    }
  }

  return transfers;
}

export async function inspectTransaction(
  hash: Hex,
  rpcUrl = process.env.ETHEREUM_RPC_URL || "https://ethereum.publicnode.com",
): Promise<TransactionDetails> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, { timeout: 12_000, retryCount: 1 }),
  });

  try {
    const chainId = await client.getChainId();
    if (chainId !== mainnet.id) {
      throw new EthereumInspectionError(
        "WRONG_NETWORK",
        "Configured Ethereum RPC is not on mainnet.",
      );
    }

    const transaction = await client.getTransaction({ hash });
    let receipt;
    if (transaction.blockNumber !== null) {
      try {
        receipt = await client.getTransactionReceipt({ hash });
      } catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
      }
    }

    const logs = (receipt?.logs ?? []).map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      logIndex: log.logIndex,
    }));

    return {
      hash: transaction.hash,
      from: transaction.from,
      to: transaction.to,
      valueEth: formatEther(transaction.value),
      valueWei: transaction.value.toString(),
      blockNumber: (receipt?.blockNumber ?? transaction.blockNumber)?.toString() ?? null,
      status: receipt?.status ?? "pending",
      gasUsed: receipt?.gasUsed.toString() ?? null,
      gasPriceGwei: receipt?.effectiveGasPrice !== undefined
        ? formatUnits(receipt.effectiveGasPrice, 9)
        : transaction.gasPrice !== undefined
          ? formatUnits(transaction.gasPrice, 9)
          : null,
      logs,
      erc20Transfers: decodeErc20Transfers(logs),
    };
  } catch (error) {
    if (error instanceof EthereumInspectionError) throw error;
    if (error instanceof TransactionNotFoundError) {
      throw new EthereumInspectionError("NOT_FOUND", "Transaction not found on Ethereum mainnet.");
    }
    throw new EthereumInspectionError("RPC_ERROR", "Ethereum RPC is unavailable. Try again shortly.");
  }
}
