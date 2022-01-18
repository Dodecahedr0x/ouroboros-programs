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

export const testCreateBeneficiary = (provider: Provider) =>
  describe("Create a beneficiary", () => {
    setProvider(provider);

    const program = workspace.Ouroboros as Program<Ouroboros>;

    let creator: Keypair;
    let ouroborosId = new BN(Math.round(Math.random() * 100000));
    const initialSupply = new BN(10 ** 10);
    const rewardPeriod = new BN(5);
    const startDate = new BN(10000000000);
    const expansionFactor = new BN(10000);
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
      const [mintAddress, mintBump] =
        await PublicKey.findProgramAddress(
          [Buffer.from("mint"), ouroborosId.toBuffer("le", 8)],
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

    it("Create a beneficiary", async () => {
      const [ouroborosAddress] =
        await PublicKey.findProgramAddress(
          [Buffer.from("ouroboros"), ouroborosId.toBuffer("le", 8)],
          program.programId
        );

      const someAccount = Keypair.generate().publicKey;
      const [beneficiaryAddress, beneficiaryBump] = await PublicKey.findProgramAddress(
        [Buffer.from("beneficiary"), someAccount.toBuffer()],
        program.programId
      );

      await program.rpc.createBeneficiary(
        beneficiaryBump,
        someAccount,
        {
          accounts: {
            ouroboros: ouroborosAddress,
            beneficiary: beneficiaryAddress,
            creator: creator.publicKey,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );

      const b = await program.account.beneficiary.fetch(beneficiaryAddress);

      expect(b.account.toString()).to.equal(someAccount.toString());
      expect(b.votes.toString()).to.equal(new BN(0).toString());
      expect(b.weight.toString()).to.equal(new BN(0).toString());
      expect(b.lastUpdate.toString()).to.equal(startDate.toString());
    });
  });
