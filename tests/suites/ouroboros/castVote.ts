import { expect } from "chai";
import { setProvider, Provider, BN, Wallet } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { airdropUsers } from "../../helpers";
import { Beneficiary, Locker, Ouroboros } from "../../../ts";

export const testCastVote = (provider: Provider) =>
  describe("Cast a vote using a locker", () => {
    setProvider(provider);

    let creator: Keypair;
    let ouroboros: Ouroboros;
    let locker: Locker;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    let lockerId = Keypair.generate().publicKey;
    let someAccount = Keypair.generate().publicKey;
    let someAccount2 = Keypair.generate().publicKey;
    let beneficiary: Beneficiary;
    let beneficiary2: Beneficiary;
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(10000);
    const timeMultiplier = new BN(10000);
    const depositAmount = new BN(10 ** 9);

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

      beneficiary = await ouroboros.createBeneficiary(someAccount);
      beneficiary2 = await ouroboros.createBeneficiary(someAccount2);

      const lockingPeriod = new BN(604800);
      locker = await ouroboros.createLocker(
        lockerId,
        depositAmount,
        lockingPeriod
      );
    });

    it("Cast the first vote", async () => {
      await locker.castVote(beneficiary, beneficiary2);

      const l = await ouroboros.program.account.locker.fetch(
        locker.addresses.locker
      );

      expect(l.beneficiary.toString()).to.equal(beneficiary.address.toString());
      expect(l.votes.toString()).to.equal(depositAmount.toString());

      const b = await ouroboros.program.account.beneficiary.fetch(
        beneficiary.address
      );

      expect(b.account.toString()).to.equal(someAccount.toString());
      expect(b.votes.toString()).to.equal(depositAmount.toString());
      expect(b.weight.toString()).to.equal(new BN(0).toString());
    });
  });
