#![cfg_attr(feature = "no-entrypoint", allow(dead_code))]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::{ouroboros::*, locker::*};

declare_id!("3MVR32fVYfnzR1VK8nmUE6XqAVvQy2N2dcHToeB8r78p");

#[program]
mod ouroboros {
    use super::*;

    /// Initializes the ouroboros
    pub fn initialize_ouroboros(
        ctx: Context<InitializeOuroboros>,
        bumps: InitializeOuroborosBumps,
        ouroboros_id: u64,
        initial_supply: u64,
        base_weekly_emissions: u64,
        time_multiplier: u64
    ) -> ProgramResult {
        instructions::initialize_ouroboros::handler(
            ctx,
            bumps,
            ouroboros_id,
            initial_supply,
            base_weekly_emissions,
            time_multiplier
        )
    }

    /// Create a token locker
    pub fn create_locker(
        ctx: Context<CreateLocker>,
        bumps: CreateLockerBumps,
        id: Pubkey,
    ) -> ProgramResult {
        instructions::create_locker::handler(
            ctx,
            bumps,
            id,
        )
    }
}