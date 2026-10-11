import { describe, expect, it } from "vitest";
import { decodeErc20Transfers, isTransactionHash } from "./ethereum";

const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

describe("isTransactionHash", () => {
  it("accepts exactly 32 bytes of hex after the 0x prefix", () => {
    expect(isTransactionHash(`0x${"aB".repeat(32)}`)).toBe(true);
    expect(isTransactionHash(`0x${"ab".repeat(31)}`)).toBe(false);
    expect(isTransactionHash(`0x${"ab".repeat(33)}`)).toBe(false);
    expect(isTransactionHash(`0x${"gg".repeat(32)}`)).toBe(false);
    expect(isTransactionHash("not-a-hash")).toBe(false);
  });
});

describe("decodeErc20Transfers", () => {
  it("decodes the standard three-topic Transfer log to raw token units", () => {
    const result = decodeErc20Transfers([
      {
        address: "0x3333333333333333333333333333333333333333",
        data: `0x${"0".repeat(62)}2a`,
        topics: [
          transferTopic,
          `0x${"0".repeat(24)}${"1".repeat(40)}`,
          `0x${"0".repeat(24)}${"2".repeat(40)}`,
        ],
        logIndex: 7,
      },
    ]);

    expect(result).toEqual([
      {
        tokenAddress: "0x3333333333333333333333333333333333333333",
        from: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        valueRaw: "42",
        logIndex: 7,
      },
    ]);
  });

  it("skips four-topic ERC-721 logs and malformed Transfer data", () => {
    expect(
      decodeErc20Transfers([
        {
          address: "0x3333333333333333333333333333333333333333",
          data: "0x",
          topics: [
            transferTopic,
            `0x${"0".repeat(24)}${"1".repeat(40)}`,
            `0x${"0".repeat(24)}${"2".repeat(40)}`,
            `0x${"0".repeat(63)}1`,
          ],
          logIndex: 1,
        },
        {
          address: "0x3333333333333333333333333333333333333333",
          data: "0x1234",
          topics: [
            transferTopic,
            `0x${"0".repeat(24)}${"1".repeat(40)}`,
            `0x${"0".repeat(24)}${"2".repeat(40)}`,
          ],
          logIndex: 2,
        },
      ]),
    ).toEqual([]);
  });
});
