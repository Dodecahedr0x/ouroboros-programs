import { setProvider, Provider } from "@project-serum/anchor";
import { testCreatePair } from "./suites/createPair";
import { testAddLiquidity } from "./suites/addLiquidity";
import { testRemoveLiquidity } from "./suites/removeLiquidity";
import { testSwapExactInput } from "./suites/swapExactInput";

describe("Pools", () => {
  const provider = Provider.local();
  setProvider(provider);

  testCreatePair(provider);
  testAddLiquidity(provider);
  testRemoveLiquidity(provider);
  testSwapExactInput(provider);
});
