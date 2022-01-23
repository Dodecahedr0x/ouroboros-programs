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

export const testReceiveAsset = (provider: Provider) =>
  describe("Receive an asset", () => {
    setProvider(provider);

    const program = workspace.Ouroboros as Program<Ouroboros>;

    let creator: Keypair;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    let lockerId = Keypair.generate().publicKey;
    let someAccount = Keypair.generate().publicKey;
    let someAccount2 = Keypair.generate().publicKey;
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(10000);
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

      const [beneficiaryAddress, beneficiaryBump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("beneficiary"),
            ouroborosId.toBuffer("le", 8),
            someAccount.toBuffer(),
          ],
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
          [
            Buffer.from("beneficiary"),
            ouroborosId.toBuffer("le", 8),
            someAccount2.toBuffer(),
          ],
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
        [
          Buffer.from("locker"),
          ouroborosId.toBuffer("le", 8),
          lockerId.toBuffer(),
        ],
        program.programId
      );
      const [receiptAddress, receiptBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("receipt"),
          ouroborosId.toBuffer("le", 8),
          lockerId.toBuffer(),
        ],
        program.programId
      );
      const [accountAddress, accountBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("locker_account"),
          ouroborosId.toBuffer("le", 8),
          lockerId.toBuffer(),
        ],
        program.programId
      );

      bumps = {
        locker: lockerBump,
        receipt: receiptBump,
        account: accountBump,
      };

      const nativeMint = new Token(
        provider.connection,
        mintAddress,
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
    });

    it("Receive asset", async () => {
      const [ouroborosAddress, ouroborosBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("ouroboros"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
      const [mintAddress, mintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("mint"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );
      const [assetAddress, assetBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("asset"),
          ouroborosId.toBuffer("le", 8),
          mintAddress.toBuffer(),
        ],
        program.programId
      );
      const [assetAuthorityAddress, assetAuthorityBump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("asset_authority"),
            ouroborosId.toBuffer("le", 8),
            mintAddress.toBuffer(),
          ],
          program.programId
        );
      const [snapshotAddress, snapshotBump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("snapshot"),
            ouroborosId.toBuffer("le", 8),
            mintAddress.toBuffer(),
            new BN(0).toBuffer("le", 8),
          ],
          program.programId
        );
      const [accountAddress, accountBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("asset_account"),
          ouroborosId.toBuffer("le", 8),
          mintAddress.toBuffer(),
        ],
        program.programId
      );

      const assetBumps = {
        asset: assetBump,
        authority: assetAuthorityBump,
        account: accountBump,
      };

      const token = new Token(
        provider.connection,
        mintAddress,
        TOKEN_PROGRAM_ID,
        creator
      );

      // const payerAccount = await Token.getAssociatedTokenAddress(
      //   ASSOCIATED_TOKEN_PROGRAM_ID,
      //   TOKEN_PROGRAM_ID,
      //   mintAddress,
      //   creator.publicKey
      // );
      const senderAccount = await token.getOrCreateAssociatedAccountInfo(
        creator.publicKey
      );

      const sentAmount = new BN(10 ** 9)
      await program.rpc.receiveAsset(
        assetBumps,
        snapshotBump,
        new BN(0),
        sentAmount,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            asset: assetAddress,
            authority: assetAuthorityAddress,
            currentSnapshot: snapshotAddress,
            mint: mintAddress,
            ouroborosAccount: accountAddress,
            sender: creator.publicKey,
            senderAccount: senderAccount.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      const a = await program.account.asset.fetch(assetAddress);

      expect(a.mint.toString()).to.equal(mintAddress.toString());
      expect(a.authority.toString()).to.equal(assetAuthorityAddress.toString());

      const s = await program.account.snapshot.fetch(snapshotAddress);

      expect(s.mint.toString()).to.equal(mintAddress.toString());
      expect(s.votes.toString()).to.equal(depositAmount.toString());
      expect(s.rewards.toString()).to.equal(sentAmount.toString());
    });
  });
