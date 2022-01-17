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
    let ouroborosId = new BN(5);
    const initialSupply = new BN(10 ** 10);
    const baseRewards = new BN(10 ** 10);
    const timeMultiplier = new BN(192);

    before(async () => {
      creator = Keypair.generate();
      await airdropUsers([creator], provider);
    });

    it("Create a locker", async () => {
      let lockerId = Keypair.generate().publicKey;

      const [ouroborosAddress, ouroborosBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("ouroboros"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );
      const [authority, authorityBump] = await PublicKey.findProgramAddress(
        [Buffer.from("authority"), ouroborosId.toBuffer("le", 8)],
        program.programId
      );
      const [nativeMint, nativeMintBump] = await PublicKey.findProgramAddress(
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
      const [accountAddress, addressBump] = await PublicKey.findProgramAddress(
        [Buffer.from("locker_account"), lockerId.toBuffer()],
        program.programId
      );

      const bumps = {
        locker: lockerBump,
        receipt: receiptBump,
        account: addressBump,
      };

      const creatorAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        nativeMint,
        creator.publicKey
      );

      await program.rpc.createLocker(
        bumps,
        lockerId,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            authority: authority,
            nativeMint: nativeMint,
            owner: creator.publicKey,
            locker: lockerAddress,
            receipt: creatorAccount,
            receiptAccount: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      const l = await program.account.locker.fetch(lockerAddress);
      console.log(l)

      expect(l.id.toString()).to.equal(lockerId.toString());
      expect(l.receipt.toString()).to.equal(receiptAddress.toString());
      expect(l.amount.toString()).to.equal(new BN(0).toString());
      expect(l.votes.toString()).to.equal(new BN(0).toString());
      expect(l.unlockTimestamp.toString()).to.equal(new BN(0).toString());
      expect(l.timeMultiplier.toString()).to.equal(timeMultiplier.toString());
    });
  });
