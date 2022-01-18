import { setProvider, Provider } from "@project-serum/anchor";
import { testCreateLocker } from "./suites/createLocker";
import { testInitializeOuroboros } from "./suites/initializeOuroboros";

describe("Ouroboros", () => {
  const provider = Provider.local();
  setProvider(provider);

  testInitializeOuroboros(provider);
  testCreateLocker(provider);
});
