import { expect } from "chai";
import {
  setProvider,
  Provider,
  Program,
  workspace,
  BN,
} from "@project-serum/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { Ouroboros } from "../../../target/types/ouroboros";
import { airdropUsers } from "../../helpers";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const testClaimIncentives = (provider: Provider) =>
  describe("Claim a incentives for a beneficiary", () => {
    setProvider(provider);

    const program = workspace.Ouroboros as Program<Ouroboros>;

    let creator: Keypair;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    let lockerId = Keypair.generate().publicKey;
    let someAccount;
    let someAccount2;
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(500);
    const timeMultiplier = new BN(10000);
    const depositAmount = new BN(10 ** 9);

    before(async () => {
      creator = Keypair.generate();
      await airdropUsers([creator], provider);

      const [ouroborosAddress, ouroborosBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("ouroboros"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
      const [authorityAddress, authorityBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("authority"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
      const [mintAddress, mintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("mint"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );

      let bumps: any = {
        ouroboros: ouroborosBump,
        authority: authorityBump,
        mint: mintBump,
      };

      const creatorAccountAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintAddress,
        creator.publicKey
      );

      await program.rpc.initializeOuroboros(
        bumps,
        ouroborosId,
        initialSupply,
        rewardPeriod,
        startDate,
        expansionFactor,
        timeMultiplier,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            authority: authorityAddress,
            mint: mintAddress,
            creator: creator.publicKey,
            creatorAccount: creatorAccountAddress,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      const nativeMint = new Token(
        provider.connection,
        mintAddress,
        TOKEN_PROGRAM_ID,
        creator
      );
      const creatorAccount = await nativeMint.getOrCreateAssociatedAccountInfo(
        creator.publicKey
      );
      someAccount = (
        await nativeMint.getOrCreateAssociatedAccountInfo(
          Keypair.generate().publicKey
        )
      ).address;
      someAccount2 = (
        await nativeMint.getOrCreateAssociatedAccountInfo(
          Keypair.generate().publicKey
        )
      ).address;

      const [beneficiaryAddress, beneficiaryBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("beneficiary"), someAccount.toBuffer()],
          program.programId
        );

      await program.rpc.createBeneficiary(beneficiaryBump, someAccount, {
        accounts: {
          ouroboros: ouroborosAddress,
          beneficiary: beneficiaryAddress,
          creator: creator.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [creator],
      });

      const [beneficiary2Address, beneficiary2Bump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("beneficiary"), someAccount2.toBuffer()],
          program.programId
        );

      await program.rpc.createBeneficiary(beneficiary2Bump, someAccount2, {
        accounts: {
          ouroboros: ouroborosAddress,
          beneficiary: beneficiary2Address,
          creator: creator.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [creator],
      });

      const [lockerAddress, lockerBump] = await PublicKey.findProgramAddress(
        [Buffer.from("locker"), lockerId.toBuffer()],
        program.programId
      );
      const [receiptAddress, receiptBump] = await PublicKey.findProgramAddress(
        [Buffer.from("receipt"), lockerId.toBuffer()],
        program.programId
      );
      const [accountAddress, accountBump] = await PublicKey.findProgramAddress(
        [Buffer.from("locker_account"), lockerId.toBuffer()],
        program.programId
      );

      bumps = {
        locker: lockerBump,
        receipt: receiptBump,
        account: accountBump,
      };

      const receiptAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        receiptAddress,
        creator.publicKey
      );

      const lockingPeriod = new BN(604800);

      await program.rpc.createLocker(
        bumps,
        lockerId,
        depositAmount,
        lockingPeriod,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            authority: authorityAddress,
            mint: mintAddress,
            locker: lockerAddress,
            lockerAccount: accountAddress,
            creator: creator.publicKey,
            creatorAccount: creatorAccount.address,
            receipt: receiptAddress,
            receiptAccount: receiptAccount,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      await program.rpc.castVote({
        accounts: {
          ouroboros: ouroborosAddress,
          beneficiary: beneficiaryAddress,
          oldBeneficiary: beneficiary2Address,
          locker: lockerAddress,
          voter: creator.publicKey,
          receiptAccount: receiptAccount,
        },
        signers: [creator],
      });
    });

    it("Claim incentives", async () => {
      const [ouroborosAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("ouroboros"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );
      const [authorityAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("authority"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );
      const [mintAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("mint"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );
      const [beneficiaryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("beneficiary"), someAccount.toBuffer()],
        program.programId
      );

      await program.rpc.claimIncentives({
        accounts: {
          ouroboros: ouroborosAddress,
          authority: authorityAddress,
          mint: mintAddress,
          beneficiary: beneficiaryAddress,
          account: someAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
      });

      const b = await program.account.beneficiary.fetch(beneficiaryAddress);

      expect(b.account.toString()).to.equal(someAccount.toString());
      expect(b.votes.toString()).to.equal(depositAmount.toString());
      expect(b.weight.toString()).to.equal(new BN(10000).toString());

      const nativeMint = new Token(
        provider.connection,
        mintAddress,
        TOKEN_PROGRAM_ID,
        creator
      );
      expect(
        (await nativeMint.getAccountInfo(someAccount)).amount.toString()
      ).to.equal(initialSupply.sub(depositAmount).mul(expansionFactor).div(new BN(10000)).toString());
    });
  });
