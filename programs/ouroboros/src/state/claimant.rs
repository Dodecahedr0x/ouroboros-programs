use anchor_lang::prelude::*;

/// Represents a locker holder's claim history for a specific asset
#[account]
#[derive(Default)]
pub struct Claimant {
    /// The owner of the locker being claimed
    pub owner: Pubkey,

    /// The asset being claimed
    pub mint: Pubkey,

    /// Last time the owner claimed
    pub last_claim: i64,

    /// The bump used to generate PDAs
    pub bump: u8,
}
