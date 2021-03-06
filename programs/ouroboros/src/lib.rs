#![cfg_attr(feature = "no-entrypoint", allow(dead_code))]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::{asset::*, locker::*, ouroboros::*};

declare_id!("3MVR32fVYfnzR1VK8nmUE6XqAVvQy2N2dcHToeB8r78p");

#[program]
mod ouroboros {
    use super::*;

    /// Initializes the ouroboros
    pub fn initialize_ouroboros(
        ctx: Context<InitializeOuroboros>,
        bumps: OuroborosBumps,
        ouroboros_id: u64,
        initial_supply: u64,
        period: u64,
        start_date: i64,
        expansion_factor: u64,
        time_multiplier: u64,
    ) -> ProgramResult {
        instructions::initialize_ouroboros::handler(
            ctx,
            bumps,
            ouroboros_id,
            initial_supply,
            period,
            start_date,
            expansion_factor,
            time_multiplier,
        )
    }

    /// Create a beneficiary of the protocol
    pub fn create_beneficiary(
        ctx: Context<CreateBeneficiary>,
        bump: u8,
        account: Pubkey,
    ) -> ProgramResult {
        instructions::create_beneficiary::handler(ctx, bump, account)
    }

    /// Create a token locker
    pub fn create_locker(
        ctx: Context<CreateLocker>,
        bumps: LockerBumps,
        id: Pubkey,
        amount: u64,
        period: u64,
    ) -> ProgramResult {
        instructions::create_locker::handler(ctx, bumps, id, amount, period)
    }

    /// Use a locker to vote
    pub fn cast_vote(ctx: Context<CastVote>) -> ProgramResult {
        instructions::cast_vote::handler(ctx)
    }

    /// Claims incentives for a beneficiary
    pub fn claim_incentives(ctx: Context<ClaimIncentives>) -> ProgramResult {
        instructions::claim_incentives::handler(ctx)
    }

    /// Called by a bribed service to notify the ouroboros
    pub fn receive_asset(
        ctx: Context<ReceiveAsset>,
        bumps: AssetBumps,
        snapshot_bump: u8,
        snapshot_index: u64,
        amount: u64,
    ) -> ProgramResult {
        instructions::receive_asset::handler(ctx, bumps, snapshot_bump, snapshot_index, amount)
    }

    /// Lets a locker collect the fees it has collected for given period
    pub fn collect_fees(ctx: Context<CollectFees>, bump: u8) -> ProgramResult {
        instructions::collect_fees::handler(ctx, bump)
    }
}
