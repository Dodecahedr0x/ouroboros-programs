use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct LockerBumps {
    pub locker: u8,
    pub receipt: u8,
    pub account: u8
}

/// A vesting locker account
#[account]
#[derive(Default)]
pub struct Locker {
    /// The unique identifier
    pub id: Pubkey,

    /// The receipt needed to unlock the locker
    pub receipt: Pubkey,

    /// The beneficiary of this locker's vote
    pub beneficiary: Pubkey,

    /// The amount of tokens locked
    pub amount: u64,

    /// Votes granted by this locker
    pub votes: u64,

    /// The creation date of the locker
    pub creation_timestamp: i64,

    /// The unlock date of the locker
    pub unlock_timestamp: i64,

    /// The bump used to generate PDAs
    pub bumps: LockerBumps,
}
