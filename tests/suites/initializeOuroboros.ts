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

export const testInitializeOuroboros = (provider: Provider) =>
  describe("Initializing the lottery", () => {
    setProvider(provider);

    const program = workspace.Ouroboros as Program<Ouroboros>;

    let creator: Keypair;
    let id = new BN(5);
    const initialSupply = new BN(10 ** 10);
    const baseRewards = new BN(10 ** 10);
    const timeMultiplier = new BN(192);

    before(async () => {
      creator = Keypair.generate();
      await airdropUsers([creator], provider);
    });

    it("Initializes an Ouroboros", async () => {
      const [ouroborosAddress, ouroborosBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("ouroboros"), id.toBuffer("le", 8)],
          program.programId
        );
      const [authority, authorityBump] = await PublicKey.findProgramAddress(
        [Buffer.from("authority"), id.toBuffer("le", 8)],
        program.programId
      );
      const [nativeMint, nativeMintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("native"), id.toBuffer("le", 8)],
        program.programId
      );
      const [lockedMint, lockedMintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("locked"), id.toBuffer("le", 8)],
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
        nativeMint,
        creator.publicKey
      );

      await program.rpc.initializeOuroboros(
        bumps,
        id,
        initialSupply,
        baseRewards,
        timeMultiplier,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            authority: authority,
            nativeMint: nativeMint,
            lockedMint: lockedMint,
            creator: creator.publicKey,
            creatorAccount: creatorAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      const o = await program.account.ouroboros.fetch(ouroborosAddress);
      console.log(o)

      // expect(s.owner.toString()).to.equal(owner.publicKey.toString());
      // expect(s.key.toString()).to.equal(lotteryKey.toString());
      // expect(s.mint.toString()).to.equal(mintRewards.publicKey.toString());
      // expect(s.escrow.toString()).to.equal(escrow.toString());
      // expect(s.mint.toString()).to.equal(mintRewards.publicKey.toString());
      // expect(s.period.toString()).to.equal(period.toString());
      // expect(s.treasury.toString()).to.equal(treasury.toString());
    });
  });
