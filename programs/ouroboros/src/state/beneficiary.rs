use anchor_lang::prelude::*;

/// A vesting locker account
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

impl Beneficiary {
    pub fn update(&mut self, current_time: i64, rewards_period: i64, total_votes: u64) {
        if current_time  <= self.last_update + rewards_period {
            self.last_update += rewards_period;
            self.weight = (self.votes / total_votes) as u16;
        }
    }
}
