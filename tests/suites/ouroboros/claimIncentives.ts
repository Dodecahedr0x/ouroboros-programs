import { expect } from "chai";
import {
  setProvider,
  Provider,
  BN,
  Wallet,
} from "@project-serum/anchor";
import { Transaction, Keypair } from "@solana/web3.js";
import { airdropUsers } from "../../helpers";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Beneficiary, Ouroboros, Locker } from "../../../ts";

export const testClaimIncentives = (provider: Provider) =>
  describe("Claim a incentives for a beneficiary", () => {
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
    const expansionFactor = new BN(500);
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

      const account = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        ouroboros.addresses.mint,
        someAccount
      );
      await ouroboros.provider.send(
        new Transaction().add(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            ouroboros.addresses.mint,
            account,
            someAccount,
            creator.publicKey
          )
        )
      );
      beneficiary = await ouroboros.createBeneficiary(account);
      beneficiary2 = await ouroboros.createBeneficiary(someAccount2);

      const lockingPeriod = new BN(604800);
      locker = await ouroboros.createLocker(
        lockerId,
        depositAmount,
        lockingPeriod
      );

      await locker.castVote(beneficiary, beneficiary2);
    });

    it("Claim incentives", async () => {
      await beneficiary.claimIncentives();

      const b = await ouroboros.program.account.beneficiary.fetch(beneficiary.address);

      expect(b.account.toString()).to.equal(
        (
          await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            ouroboros.addresses.mint,
            someAccount
          )
        ).toString()
      );
      expect(b.votes.toString()).to.equal(depositAmount.toString());
      expect(b.weight.toString()).to.equal(new BN(10000).toString());

      const nativeMint = new Token(
        provider.connection,
        ouroboros.addresses.mint,
        TOKEN_PROGRAM_ID,
        creator
      );
      expect(
        (await nativeMint.getAccountInfo(beneficiary.account)).amount.toString()
      ).to.equal(
        initialSupply
          .sub(depositAmount)
          .mul(expansionFactor)
          .div(new BN(10000))
          .toString()
      );
    });
  });
