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
import { Ouroboros } from "../../../target/types/ouroboros";
import { airdropUsers } from "../../helpers";
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
    let id = new BN(Math.round(Math.random() * 100000));
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(10000);
    const timeMultiplier = new BN(10000);


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
      const [authorityAddress, authorityBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("authority"), id.toBuffer("le", 8)],
          program.programId
        );
      const [mintAddress, mintBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("mint"), id.toBuffer("le", 8)],
          program.programId
        );

      const bumps = {
        ouroboros: ouroborosBump,
        authority: authorityBump,
        mint: mintBump,
      };

      const creatorAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintAddress,
        creator.publicKey
      );

      await program.rpc.initializeOuroboros(
        bumps,
        id,
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
      expect(o.mint.toString()).to.equal(mintAddress.toString());
      expect(o.rewardPeriod.toString()).to.equal(rewardPeriod.toString());
      expect(o.lastRewardPeriod.toString()).to.equal(startDate.toString());
      expect(o.expansionFactor.toString()).to.equal(expansionFactor.toString());
      expect(o.timeMultiplier.toString()).to.equal(timeMultiplier.toString());

      const nativeMint = new Token(
        provider.connection,
        mintAddress,
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
