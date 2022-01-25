import { Provider, BN, workspace, Program, Idl } from "@project-serum/anchor";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { OuroborosBumps } from "./types";
import { Ouroboros as OuroborosType } from "../target/types/ouroboros";
import OuroborosIdl from "../target/idl/ouroboros.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Asset, Beneficiary, LockerBumps, Ouroboros } from ".";

/**
 * A helper class to interact with an instance of a locker
 */
export class Locker {
  ouroboros: Ouroboros;
  id: PublicKey;
  recept: PublicKey;
  period: BN;
  expansionFactor: BN;
  timeMultiplier: BN;
  claimant: PublicKey;
  addresses: {
    locker: PublicKey;
    receipt: PublicKey;
    account: PublicKey;
  };
  bumps: LockerBumps;

  constructor(ouroboros: Ouroboros, id: PublicKey) {
    this.ouroboros = ouroboros;
    this.id = id;

    const [lockerAddress, lockerBump] = findProgramAddressSync(
      [Buffer.from("locker"), ouroboros.id.toBuffer("le", 8), id.toBuffer()],
      ouroboros.program.programId
    );
    const [receiptAddress, receiptBump] = findProgramAddressSync(
      [Buffer.from("receipt"), ouroboros.id.toBuffer("le", 8), id.toBuffer()],
      ouroboros.program.programId
    );
    const [accountAddress, accountBump] = findProgramAddressSync(
      [
        Buffer.from("locker_account"),
        ouroboros.id.toBuffer("le", 8),
        id.toBuffer(),
      ],
      ouroboros.program.programId
    );

    this.bumps = {
      locker: lockerBump,
      receipt: receiptBump,
      account: accountBump,
    };
    this.addresses = {
      locker: lockerAddress,
      receipt: receiptAddress,
      account: accountAddress,
    };
  }

  /**
   *
   * @param ouroboros - The parent Ouroboros
   * @param id - The identifier of the locker
   * @param creator - The wallet creating the locker
   * @param amount - The amount of tokens to lock
   * @param duration - The locking duration
   * @returns - The locker
   */
  static async create(
    ouroboros: Ouroboros,
    id: PublicKey,
    amount: BN,
    duration: BN
  ) {
    const locker = new Locker(ouroboros, id);

    const nativeMint = new Token(
      ouroboros.provider.connection,
      ouroboros.addresses.mint,
      TOKEN_PROGRAM_ID,
      ouroboros.provider.wallet as any
    );

    const creatorAccount = await nativeMint.getOrCreateAssociatedAccountInfo(
      ouroboros.provider.wallet.publicKey
    );

    const receiptAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      locker.addresses.receipt,
      ouroboros.provider.wallet.publicKey
    );

    await ouroboros.program.rpc.createLocker(
      locker.bumps,
      id,
      amount,
      duration,
      {
        accounts: {
          ouroboros: ouroboros.addresses.ouroboros,
          authority: ouroboros.addresses.authority,
          mint: ouroboros.addresses.mint,
          locker: locker.addresses.locker,
          lockerAccount: locker.addresses.account,
          creator: ouroboros.provider.wallet.publicKey,
          creatorAccount: creatorAccount.address,
          receipt: locker.addresses.receipt,
          receiptAccount: receiptAccount,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    return locker;
  }

  /**
   * Sets the vote of a locker to a given beneficiary
   *
   * @param beneficiary - The beneficiary of incentives
   * @param oldBeneficiary - The old beneficiary of incentives
   */
  async castVote(beneficiary: Beneficiary, oldBeneficiary: Beneficiary) {
    const receiptAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.addresses.receipt,
      this.ouroboros.provider.wallet.publicKey
    );

    await this.ouroboros.program.rpc.castVote({
      accounts: {
        ouroboros: this.ouroboros.addresses.ouroboros,
        beneficiary: beneficiary.address,
        oldBeneficiary: oldBeneficiary.address,
        locker: this.addresses.locker,
        voter: this.ouroboros.provider.wallet.publicKey,
        receiptAccount: receiptAccount,
      },
    });
  }

  async collectFees(
    asset: Asset,
    previousSnapshotIndex: number,
    currentSnapshotIndex: number
  ) {
    if (!asset.asset) return;

    const [previousSnapshotAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from("snapshot"),
        this.ouroboros.id.toBuffer("le", 8),
        asset.mint.toBuffer(),
        new BN(previousSnapshotIndex).toBuffer("le", 8),
      ],
      this.ouroboros.program.programId
    );
    const [snapshotAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from("snapshot"),
        this.ouroboros.id.toBuffer("le", 8),
        asset.mint.toBuffer(),
        new BN(currentSnapshotIndex).toBuffer("le", 8),
      ],
      this.ouroboros.program.programId
    );
    const [claimantAddress, claimantBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("claimant"),
        this.ouroboros.id.toBuffer("le", 8),
        asset.mint.toBuffer(),
        this.addresses.locker.toBuffer(),
      ],
      this.ouroboros.program.programId
    );

    const holderAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      asset.mint,
      this.ouroboros.provider.wallet.publicKey
    );

    console.log(
      Object.entries({
        ouroboros: this.ouroboros.addresses.ouroboros,
        locker: this.addresses.locker,
        asset: asset.addresses.asset,
        authority: asset.addresses.authority,
        previousSnapshot: previousSnapshotAddress,
        currentSnapshot: snapshotAddress,
        mint: asset.mint,
        ouroborosAccount: asset.addresses.account,
        holder: this.ouroboros.provider.wallet.publicKey,
        holderAccount: holderAccount,
        claimant: claimantAddress,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      }).map((e) => [e[0], e[1].toString()]),
      await this.ouroboros.program.account.locker.fetch(this.addresses.locker),
      await this.ouroboros.program.account.snapshot.fetch(previousSnapshotAddress),
      await this.ouroboros.program.account.snapshot.fetch(snapshotAddress)
    );

    await this.ouroboros.program.rpc.collectFees(claimantBump, {
      accounts: {
        ouroboros: this.ouroboros.addresses.ouroboros,
        locker: this.addresses.locker,
        asset: asset.addresses.asset,
        authority: asset.addresses.authority,
        previousSnapshot: previousSnapshotAddress,
        currentSnapshot: snapshotAddress,
        mint: asset.mint,
        ouroborosAccount: asset.addresses.account,
        holder: this.ouroboros.provider.wallet.publicKey,
        holderAccount: holderAccount,
        claimant: claimantAddress,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      },
    });

    return {
      asset,
      account: holderAccount,
      previousSnapshot: previousSnapshotAddress,
      currentSnapshot: snapshotAddress,
    };
  }
}
