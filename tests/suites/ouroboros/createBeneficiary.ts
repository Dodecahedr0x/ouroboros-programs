import { expect } from "chai";
import { setProvider, Provider, BN, Wallet } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { airdropUsers } from "../../helpers";
import { Beneficiary, Ouroboros } from "../../../ts";

export const testCreateBeneficiary = (provider: Provider) =>
  describe("Create a beneficiary", () => {
    setProvider(provider);

    let creator: Keypair;
    let ouroboros: Ouroboros;
    let beneficiary: Beneficiary;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(10000);
    const timeMultiplier = new BN(10000);

    before(async () => {
      creator = Keypair.generate();
      await airdropUsers([creator], provider);

      ouroboros = new Ouroboros(
        new Provider(provider.connection, new Wallet(creator), {}),
        ouroborosId,
        rewardPeriod,
        expansionFactor,
        timeMultiplier
      );
      await ouroboros.initialize(creator.publicKey, initialSupply, startDate);
    });

    it("Create a beneficiary", async () => {
      const someAccount = Keypair.generate().publicKey;
      beneficiary = await ouroboros.createBeneficiary(someAccount);

      const b = await ouroboros.program.account.beneficiary.fetch(
        beneficiary.address
      );

      expect(b.account.toString()).to.equal(someAccount.toString());
      expect(b.votes.toString()).to.equal(new BN(0).toString());
      expect(b.weight.toString()).to.equal(new BN(0).toString());
      expect(b.lastUpdate.toString()).to.equal(startDate.toString());
    });
  });
