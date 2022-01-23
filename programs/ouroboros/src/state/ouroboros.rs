use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct OuroborosBumps {
    pub ouroboros: u8,
    pub authority: u8,
    pub mint: u8,
}

/// The state of the ouroboros
#[account]
#[derive(Default)]
pub struct Ouroboros {
    /// Unique identifier
    pub id: u64,

    /// The authority over native and locked tokens
    pub authority: Pubkey,

    /// The mint of the token distributed to stakers
    pub mint: Pubkey,

    /// The reward period in seconds
    pub period: u64,

    /// The last timestamp at which the protocol distributed incentives
    pub last_period: i64,

    /// Votes of the last period
    pub last_period_votes: u64,

    /// Total number of votes staked
    pub total_votes: u64,

    /// The % in BP of circulating supply expansion per period
    pub expansion_factor: u64,

    /// Each week locked multiplies the amount of votes of the locker.
    /// The unit is the basis point (10000).
    /// Formula: votes = amount * #weeks_locked * time_multiplier
    /// Example: 192 ~ staking for 2 year earns twice as much as 1 year locking
    pub time_multiplier: u64,

    /// The bump used to generate PDAs
    pub bumps: OuroborosBumps,
}
