use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CreateGaugeBumps {
    pub gauge: u8,
    pub authority: u8,
    pub mint: u8,
    pub account_a: u8,
    pub account_b: u8,
    pub fees_a: u8,
    pub fees_b: u8,
}

/// A vesting locker account
#[account]
#[derive(Default)]
pub struct Gauge {
    /// The first token of the pair
    pub mint_a: Pubkey,

    /// The second token of the pair
    pub mint_b: Pubkey,

    /// Is the pool using correlated assets
    pub stable: bool,

    /// The token representing liquidity
    pub pair_mint: Pubkey,

    /// The authority of the pair mint
    pub authority: Pubkey,

    /// The bump used to generate PDAs
    pub bumps: CreateGaugeBumps,
}
