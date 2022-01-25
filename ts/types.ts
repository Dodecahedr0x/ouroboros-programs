import { BN } from "@project-serum/anchor";
import {
    PublicKey
  } from "@solana/web3.js";

export type OuroborosBumps = {
    ouroboros: number,
    authority: number,
    mint: number
}

export type LockerBumps = {
    locker: number,
    receipt: number,
    account: number
}

export type AssetBumps = {
    asset: number,
    authority: number,
    account: number
}

export interface AssetAccount {
    /// The asset's mint
    mint: PublicKey;

    /// The authority over the asset's token
    authority: PublicKey;

    /// Total amount accumulated by the Ouroboros at last claim
    rewardHeight: BN;

    /// Last time anyone updated this asset
    lastUpdate: BN;

    /// Index of the last snapshot
    lastSnapshotIndex: BN;

    /// The bump used to generate PDAs
    bumps: AssetBumps;
}