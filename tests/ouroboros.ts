import { setProvider, Provider } from "@project-serum/anchor";
import { testCastVote } from "./suites/ouroboros/castVote";
import { testCreateBeneficiary } from "./suites/ouroboros/createBeneficiary";
import { testCreateLocker } from "./suites/ouroboros/createLocker";
import { testInitializeOuroboros } from "./suites/ouroboros/initializeOuroboros";
import { testClaimIncentives } from "./suites/ouroboros/claimIncentives";
import { testReceiveAsset } from "./suites/ouroboros/receiveAsset";

describe("Ouroboros", () => {
  const provider = Provider.local();
  setProvider(provider);

  testInitializeOuroboros(provider);
  testCreateBeneficiary(provider);
  testCreateLocker(provider);
  testCastVote(provider);
  testClaimIncentives(provider);
  testReceiveAsset(provider);
});
