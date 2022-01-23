use anchor_lang::prelude::*;

/// Snapshot of an asset's reserve at a given period
#[account]
#[derive(Default)]
pub struct Snapshot {
    /// The asset's mint
    pub mint: Pubkey,

    /// The timestamp of the start of the period snapshotted
    pub timestamp: i64,

    /// The index of the snapshot
    pub index: u64,

    /// The rewards available for this snapshot
    pub rewards: u64,

    /// The votes locked at this timestamp
    pub votes: u64,

    /// The bump used to generate PDAs
    pub bump: u8,
}
