use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::pair::*;

const MINIMUM_LIQUIDITY: u64 = 1000;

declare_id!("EL5LsNHBPaaoUJ2LmRuTpCmKPHw1jHLfiKCufTAmqYvh");

#[program]
pub mod pools {
    use super::*;
    use crate::{instructions::CreatePair, state::CreatePairBumps};

    pub fn create_pair(
        ctx: Context<CreatePair>,
        bumps: CreatePairBumps,
        stable: bool,
    ) -> ProgramResult {
        instructions::create_pair::handler(ctx, bumps, stable)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        bump: u8,
        desired_amount_a: u64,
        desired_amount_b: u64,
        min_amount_a: u64,
        min_amount_b: u64
    ) -> ProgramResult {
        instructions::add_liquidity::handler(ctx, bump, desired_amount_a, desired_amount_b, min_amount_a, min_amount_b)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        liquidity: u64
    ) -> ProgramResult {
        instructions::remove_liquidity::handler(ctx, liquidity)
    }

    pub fn swap_exact_input(
        ctx: Context<SwapExactInput>,
        amount_in_a: u64,
        amount_in_b: u64,
        min_amount_out_a: u64,
        min_amount_out_b: u64,
    ) -> ProgramResult {
        instructions::swap_exact_input::handler(ctx, amount_in_a, amount_in_b, min_amount_out_a, min_amount_out_b)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
