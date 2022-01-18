use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CreateGaugeBumps {
    pub gauge: u8,
    pub authority: u8,
    pub mint: u8,
    pub account_liquidity: u8,
    pub account_rewards: u8,
    pub account_a: u8,
    pub account_b: u8,
}

/// A vesting locker account
#[account]
#[derive(Default)]
pub struct Gauge {
    /// The pair associated with gauge
    pub pair: Pubkey,

    /// The token representing locked liquidity
    pub gauge_mint: Pubkey,

    /// The reward token for the gauge
    pub mint_rewards: Pubkey,

    /// The authority of the pair mint
    pub authority: Pubkey,

    /// The cumulative amount of fees collected
    pub cumulative_fees: u64,

    /// The bump used to generate PDAs
    pub bumps: CreateGaugeBumps,
}
