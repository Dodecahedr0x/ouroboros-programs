use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AssetBumps {
    pub asset: u8,
    pub authority: u8,
    pub account: u8
}

/// An asset that the protocol received in exchange of incentives
#[account]
#[derive(Default)]
pub struct Asset {
    /// The asset's mint
    pub mint: Pubkey,

    /// The authority over the asset's token
    pub authority: Pubkey,

    /// Total amount accumulated by the Ouroboros at last claim
    pub reward_height: u64,

    /// Last time anyone updated this asset
    pub last_update: i64,

    /// Index of the last snapshot
    pub last_snapshot_index: u64,

    /// The bump used to generate PDAs
    pub bumps: AssetBumps,
}
