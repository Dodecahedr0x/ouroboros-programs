use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::gauge::*;

declare_id!("EVHqCRXSRufttxNFQTwD1mBvmnfBqhwBkfKxUSvAPr3m");

#[program]
pub mod gauges {
    use super::*;

    pub fn create_gauge(ctx: Context<CreateGauge>, bumps: CreateGaugeBumps) -> ProgramResult {
        instructions::create_gauge::handler(ctx, bumps)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
