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
      const [authorityAddress, authorityBump] = await PublicKey.findProgramAddress(
        [Buffer.from("authority"), id.toBuffer("le", 8)],
        program.programId
      );
      const [nativeMintAddress, nativeMintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("native"), id.toBuffer("le", 8)],
        program.programId
      );
      const [lockedMintAddress, lockedMintBump] = await PublicKey.findProgramAddress(
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
        nativeMintAddress,
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

      const o = await program.account.ouroboros.fetch(ouroborosAddress);

      expect(o.id.toString()).to.equal(id.toString());
      expect(o.authority.toString()).to.equal(authorityAddress.toString());
      expect(o.nativeMint.toString()).to.equal(nativeMintAddress.toString());
      expect(o.lockedMint.toString()).to.equal(lockedMintAddress.toString());
      expect(o.baseEmissions.toString()).to.equal(baseRewards.toString());
      expect(o.timeMultiplier.toString()).to.equal(timeMultiplier.toString());
    });
  });
