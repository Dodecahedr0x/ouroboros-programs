use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeOuroborosBumps {
    pub ouroboros: u8,
    pub authority: u8,
    pub native: u8,
    pub locked: u8,
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
    pub native_mint: Pubkey,

    /// The mint representing the locked token
    pub locked_mint: Pubkey,

    /// The base amount of tokens emitted each week
    pub base_emissions: u64,

    /// Each week locked multiplies the amount of votes of the locker.
    /// The unit is the basis point (10000).
    /// Formula: votes = amount * #weeks_locked * time_multiplier
    /// Example: 192 ~ staking for 2 year earns twice as much as 1 year locking
    pub time_multiplier: u64,

    /// The bump used to generate PDAs
    pub bumps: InitializeOuroborosBumps,
}
