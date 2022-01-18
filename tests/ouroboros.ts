import { setProvider, Provider } from "@project-serum/anchor";
import { testCreateBeneficiary } from "./suites/ouroboros/createBeneficiary";
import { testCreateLocker } from "./suites/ouroboros/createLocker";
import { testInitializeOuroboros } from "./suites/ouroboros/initializeOuroboros";

describe("Ouroboros", () => {
  const provider = Provider.local();
  setProvider(provider);

  testInitializeOuroboros(provider);
  testCreateLocker(provider);
  testCreateBeneficiary(provider);
});
