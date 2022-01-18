use anchor_lang::prelude::*;

/// A staker account
#[account]
#[derive(Default)]
pub struct Staker {
    /// The owner of this account
    pub owner: Pubkey,

    /// The total fees accumulated on the last collect
    pub last_collect: u64,

    /// The bump used to generate PDAs
    pub bump: u8,
}
