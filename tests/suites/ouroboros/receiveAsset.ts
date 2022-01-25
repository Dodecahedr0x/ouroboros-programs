import { expect } from "chai";
import {
  setProvider,
  Provider,
  Program,
  workspace,
  BN,
  Wallet,
} from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { airdropUsers } from "../../helpers";
import { Ouroboros, Locker } from "../../../ts";

export const testReceiveAsset = (provider: Provider) =>
  describe("Receive an asset", () => {
    setProvider(provider);

    let creator: Keypair;
    let ouroboros: Ouroboros;
    let locker: Locker;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    let lockerId = Keypair.generate().publicKey;
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(Math.round(Date.now() / 1000) - 4);
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

      const lockingPeriod = new BN(604800);
      locker = await ouroboros.createLocker(
        lockerId,
        depositAmount,
        lockingPeriod
      );
    });

    it("Receive asset", async () => {
      const sentAmount = new BN(10 ** 9);
      const { asset, snapshot } = await ouroboros.sendAssetAndNotify(
        ouroboros.addresses.mint,
        sentAmount
      );

      const a = await ouroboros.program.account.asset.fetch(asset.addresses.asset);

      expect(a.mint.toString()).to.equal(ouroboros.addresses.mint.toString());
      expect(a.authority.toString()).to.equal(
        asset.addresses.authority.toString()
      );
      expect(a.lastSnapshotIndex.toString()).to.equal(new BN(1).toString());

      const s = await ouroboros.program.account.snapshot.fetch(snapshot);

      expect(s.mint.toString()).to.equal(ouroboros.addresses.mint.toString());
      expect(s.votes.toString()).to.equal(depositAmount.toString());
      expect(s.rewards.toString()).to.equal(sentAmount.toString());
    });
  });
