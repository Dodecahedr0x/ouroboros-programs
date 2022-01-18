import { setProvider, Provider } from "@project-serum/anchor";
import { testCreatePair } from "./suites/pools/createPair";
import { testAddLiquidity } from "./suites/pools/addLiquidity";
import { testRemoveLiquidity } from "./suites/pools/removeLiquidity";
import { testSwapExactInput } from "./suites/pools/swapExactInput";

describe("Pools", () => {
  const provider = Provider.local();
  setProvider(provider);

  // testCreatePair(provider);
  // testAddLiquidity(provider);
  // testRemoveLiquidity(provider);
  // testSwapExactInput(provider);
});
