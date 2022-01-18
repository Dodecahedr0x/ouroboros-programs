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
import { Ouroboros } from "../../target/types/ouroboros";
import { airdropUsers } from "../helpers";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const testCreateLocker = (provider: Provider) =>
  describe("Create a locker", () => {
    setProvider(provider);

    const program = workspace.Ouroboros as Program<Ouroboros>;

    let creator: Keypair;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    const initialSupply = new BN(10 ** 10);
    const baseRewards = new BN(10 ** 10);
    const timeMultiplier = new BN(10000);

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
      const [nativeMintAddress, nativeMintBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("native"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
      const [lockedMintAddress, lockedMintBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("locked"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );

      const bumps = {
        ouroboros: ouroborosBump,
        authority: authorityBump,
        native: nativeMintBump,
        locked: lockedMintBump,
      };

      const creatorAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        nativeMintAddress,
        creator.publicKey
      );

      await program.rpc.initializeOuroboros(
        bumps,
        ouroborosId,
        initialSupply,
        baseRewards,
        timeMultiplier,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            authority: authorityAddress,
            nativeMint: nativeMintAddress,
            lockedMint: lockedMintAddress,
            creator: creator.publicKey,
            creatorAccount: creatorAccount,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );
    });

    it("Create a locker", async () => {
      let lockerId = Keypair.generate().publicKey;

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
      const [nativeMintAddress, nativeMintBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("native"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
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

      const bumps = {
        locker: lockerBump,
        receipt: receiptBump,
        account: accountBump,
      };

      const nativeMint = new Token(
        provider.connection,
        nativeMintAddress,
        TOKEN_PROGRAM_ID,
        creator
      );
      const creatorAccount = await nativeMint.getOrCreateAssociatedAccountInfo(
        creator.publicKey
      );

      const receiptAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        receiptAddress,
        creator.publicKey
      );

      const depositAmount = new BN(10 ** 9);
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
            nativeMint: nativeMintAddress,
            locker: lockerAddress,
            lockerAccount: accountAddress,
            owner: creator.publicKey,
            ownerAccount: creatorAccount.address,
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

      const time = await provider.connection.getBlockTime(
        await provider.connection.getSlot("recent")
      );

      const l = await program.account.locker.fetch(lockerAddress);

      expect(l.id.toString()).to.equal(lockerId.toString());
      expect(l.receipt.toString()).to.equal(receiptAddress.toString());
      expect(l.amount.toString()).to.equal(depositAmount.toString());
      expect(l.votes.toString()).to.equal(depositAmount.toString());
      expect(l.unlockTimestamp.toString()).to.equal(
        new BN(time).add(lockingPeriod).toString()
      );

      expect(
        (
          await nativeMint.getOrCreateAssociatedAccountInfo(creator.publicKey)
        ).amount.toString()
      ).to.equal(initialSupply.sub(depositAmount).toString());
    });
  });
