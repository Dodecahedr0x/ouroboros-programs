import { expect } from "chai";
import { setProvider, Provider, BN, Wallet } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { airdropUsers } from "../../helpers";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Ouroboros } from "../../../ts/ouroboros";

export const testInitializeOuroboros = (provider: Provider) =>
  describe("Initializing the lottery", () => {
    setProvider(provider);

    let ouroboros: Ouroboros;

    let creator: Keypair;
    let id = new BN(Math.round(Math.random() * 100000));
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
        id,
        rewardPeriod,
        expansionFactor,
        timeMultiplier
      );
    });

    it("Initializes an Ouroboros", async () => {
      await ouroboros.initialize(creator.publicKey, initialSupply, startDate);

      const o = await ouroboros.program.account.ouroboros.fetch(
        ouroboros.addresses.ouroboros
      );

      expect(o.id.toString()).to.equal(id.toString());
      expect(o.authority.toString()).to.equal(
        ouroboros.addresses.authority.toString()
      );
      expect(o.mint.toString()).to.equal(ouroboros.addresses.mint.toString());
      expect(o.period.toString()).to.equal(rewardPeriod.toString());
      expect(o.lastPeriod.toString()).to.equal(startDate.toString());
      expect(o.expansionFactor.toString()).to.equal(expansionFactor.toString());
      expect(o.timeMultiplier.toString()).to.equal(timeMultiplier.toString());

      const nativeMint = new Token(
        provider.connection,
        ouroboros.addresses.mint,
        TOKEN_PROGRAM_ID,
        creator
      );
      expect(
        (
          await nativeMint.getOrCreateAssociatedAccountInfo(creator.publicKey)
        ).amount.toString()
      ).to.equal(initialSupply.toString());
    });
  });
