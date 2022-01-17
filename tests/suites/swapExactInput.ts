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

export const testSwapExactInput = (provider: Provider) =>
  describe("Swapping exact amount of tokens", () => {
    setProvider(provider);

    const program = workspace.Pools as Program<Pools>;

    let creator: Keypair;
    let tokenA: Token, tokenB: Token, pairToken: Token;
    let accountA: AccountInfo, accountB: AccountInfo;
    const initialSupply = new BN(10 ** 10);
    const desiredA = new BN(10 ** 9);
    const desiredB = new BN(10 ** 9);
    const minA = new BN(0);
    const minB = new BN(0);

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
      const [burnerAddress, burnerBump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("burner"),
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

      const stable = false;

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

      pairToken = new Token(
        provider.connection,
        mintAddress,
        TOKEN_PROGRAM_ID,
        creator
      );

      const lpAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintAddress,
        creator.publicKey
      );

      await program.rpc.addLiquidity(
        burnerBump,
        desiredA,
        desiredB,
        minA,
        minB,
        {
          accounts: {
            pair: pairAddress,
            authority: authorityAddress,
            pairMint: mintAddress,
            burnerAccount: burnerAddress,
            pairAccountA: accountAAddress,
            pairAccountB: accountBAddress,
            liquidityProvider: creator.publicKey,
            liquidityProviderAccount: lpAccount,
            mintA: tokenA.publicKey,
            mintB: tokenB.publicKey,
            accountA: accountA.address,
            accountB: accountB.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [creator],
        }
      );
    });

    it("Swap", async () => {
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

      const input = new BN(10 ** 8);

      const balanceABefore = (await tokenA.getAccountInfo(accountAAddress)).amount;
      const balanceBBefore = (await tokenB.getAccountInfo(accountBAddress)).amount;
      const feesBalanceABefore = (await tokenA.getAccountInfo(feesAAddress)).amount;
      const feesBalanceBBefore = (await tokenB.getAccountInfo(feesBAddress)).amount;

      await program.rpc.swapExactInput(new BN(0), input, new BN(0), new BN(0), {
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
          swapper: creator.publicKey,
          accountA: accountA.address,
          accountB: accountB.address,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [creator],
      });

      const aa = await tokenA.getAccountInfo(accountAAddress);
      const ab = await tokenB.getAccountInfo(accountBAddress);
      const feesBalanceA = (await tokenA.getAccountInfo(feesAAddress)).amount;
      const feesBalanceB = (await tokenB.getAccountInfo(feesBAddress)).amount;
      // A reduced, B increased
      expect(aa.amount.lt(balanceABefore)).to.equal(true);
      expect(ab.amount.gt(balanceBBefore)).to.equal(true);

      expect(feesBalanceA.toString()).to.equal(feesBalanceABefore.toString());
      expect(feesBalanceB.toString()).to.equal(feesBalanceBBefore.add(input.div(new BN(1000))).toString());
    });
  });
