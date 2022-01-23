use anchor_lang::prelude::*;

/// The beneficiary of the incentives
#[account]
#[derive(Default)]
pub struct Beneficiary {
    /// The account receiving incentives
    pub account: Pubkey,

    /// The number of staked tokens voting for this beneficiary
    pub votes: u64,

    /// The proportion of incentives this account receives (BP)
    pub weight: u16,

    /// Last time this beneficiary was updated
    pub last_update: i64,

    /// The bump used to generate PDAs
    pub bump: u8,
}
