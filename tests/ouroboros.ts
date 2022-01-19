import { setProvider, Provider } from "@project-serum/anchor";
import { testCastVote } from "./suites/ouroboros/castVote";
import { testCreateBeneficiary } from "./suites/ouroboros/createBeneficiary";
import { testCreateLocker } from "./suites/ouroboros/createLocker";
import { testInitializeOuroboros } from "./suites/ouroboros/initializeOuroboros";

describe("Ouroboros", () => {
  const provider = Provider.local();
  setProvider(provider);

  testInitializeOuroboros(provider);
  testCreateBeneficiary(provider);
  testCreateLocker(provider);
  testCastVote(provider)
});
