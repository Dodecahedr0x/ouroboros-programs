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
import { Pools } from "../../target/types/pools";
import { airdropUsers } from "../helpers";
import {
  AccountInfo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const testCreatePair = (provider: Provider) =>
  describe("Create a liquidity pair", () => {
    setProvider(provider);

    const program = workspace.Pools as Program<Pools>;

    let creator: Keypair;
    let tokenA: Token, tokenB: Token;
    let accountA: AccountInfo, accountB: AccountInfo;
    let id = new BN(5);
    const initialSupply = new BN(10 ** 10);
    const baseRewards = new BN(10 ** 10);
    const timeMultiplier = new BN(192);

    before(async () => {
      creator = Keypair.generate();
      await airdropUsers([creator], provider);

      tokenA = await Token.createMint(
        provider.connection,
        creator,
        creator.publicKey,
        null,
        9,
        TOKEN_PROGRAM_ID
      );
      accountA = await tokenA.getOrCreateAssociatedAccountInfo(
        creator.publicKey
      );
      await tokenA.mintTo(
        accountA.address,
        creator,
        [],
        initialSupply.toNumber()
      );
      tokenB = await Token.createMint(
        provider.connection,
        creator,
        creator.publicKey,
        null,
        9,
        TOKEN_PROGRAM_ID
      );
      accountB = await tokenB.getOrCreateAssociatedAccountInfo(
        creator.publicKey
      );
      await tokenB.mintTo(
        accountB.address,
        creator,
        [],
        initialSupply.toNumber()
      );
    });

    it("Create a liquidity pair", async () => {
      const [pairAddress, pairBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("pair"),
          tokenA.publicKey.toBuffer(),
          tokenB.publicKey.toBuffer(),
        ],
        program.programId
      );
      const [authorityAddress, authorityBump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("authority"),
            tokenA.publicKey.toBuffer(),
            tokenB.publicKey.toBuffer(),
          ],
          program.programId
        );
      const [mintAddress, mintBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("mint"),
          tokenA.publicKey.toBuffer(),
          tokenB.publicKey.toBuffer(),
        ],
        program.programId
      );
      const [accountAAddress, accountABump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("account_a"),
            tokenA.publicKey.toBuffer(),
            tokenB.publicKey.toBuffer(),
          ],
          program.programId
        );
      const [accountBAddress, accountBBump] =
        await PublicKey.findProgramAddress(
          [
            Buffer.from("account_b"),
            tokenA.publicKey.toBuffer(),
            tokenB.publicKey.toBuffer(),
          ],
          program.programId
        );
      const [feesAAddress, feesABump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("fees_a"),
          tokenA.publicKey.toBuffer(),
          tokenB.publicKey.toBuffer(),
        ],
        program.programId
      );
      const [feesBAddress, feesBBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("fees_b"),
          tokenA.publicKey.toBuffer(),
          tokenB.publicKey.toBuffer(),
        ],
        program.programId
      );

      const bumps = {
        pair: pairBump,
        authority: authorityBump,
        mint: mintBump,
        accountA: accountABump,
        accountB: accountBBump,
        feesA: feesABump,
        feesB: feesBBump,
      };
      const stable = true;

      await program.rpc.createPair(bumps, stable, {
        accounts: {
          pair: pairAddress,
          authority: authorityAddress,
          pairMint: mintAddress,
          mintA: tokenA.publicKey,
          mintB: tokenB.publicKey,
          pairAccountA: accountAAddress,
          pairAccountB: accountBAddress,
          feesAccountA: feesAAddress,
          feesAccountB: feesBAddress,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [creator],
      });

      const p = await program.account.pair.fetch(pairAddress);

      expect(p.mintA.toString()).to.equal(tokenA.publicKey.toString());
      expect(p.mintB.toString()).to.equal(tokenB.publicKey.toString());
      expect(p.stable).to.equal(stable);
      expect(p.pairMint.toString()).to.equal(mintAddress.toString());
      expect(p.authority.toString()).to.equal(authorityAddress.toString());
    });
  });
