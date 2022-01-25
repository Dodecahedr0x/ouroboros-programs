import { expect } from "chai";
import { setProvider, Provider, BN, Wallet } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { Ouroboros, Locker } from "../../../ts";
import { airdropUsers } from "../../helpers";

export const testCreateLocker = (provider: Provider) =>
  describe("Create a locker", () => {
    setProvider(provider);

    let ouroboros: Ouroboros;
    let locker: Locker;
    let creator: Keypair;
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

    it("Create a locker", async () => {
      let lockerId = Keypair.generate().publicKey;

      const depositAmount = new BN(10 ** 9);
      const lockingPeriod = new BN(604800);

      locker = await ouroboros.createLocker(
        lockerId,
        depositAmount,
        lockingPeriod
      );

      const time = await provider.connection.getBlockTime(
        await provider.connection.getSlot("recent")
      );

      const o = await ouroboros.program.account.ouroboros.fetch(
        ouroboros.addresses.ouroboros
      );

      expect(o.totalVotes.toString()).to.equal(depositAmount.toString());

      const l = await ouroboros.program.account.locker.fetch(
        locker.addresses.locker
      );

      expect(l.id.toString()).to.equal(lockerId.toString());
      expect(l.receipt.toString()).to.equal(
        locker.addresses.receipt.toString()
      );
      expect(l.amount.toString()).to.equal(depositAmount.toString());
      expect(l.votes.toString()).to.equal(depositAmount.toString());
      expect(l.unlockTimestamp.toString()).to.equal(
        new BN(time).add(lockingPeriod).toString()
      );

      expect(
        (
          await ouroboros.token.getOrCreateAssociatedAccountInfo(
            creator.publicKey
          )
        ).amount.toString()
      ).to.equal(initialSupply.sub(depositAmount).toString());
    });
  });
