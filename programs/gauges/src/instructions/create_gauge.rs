use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use pools::state::Pair;
use crate::state::{CreateGaugeBumps, Gauge};

#[derive(Accounts)]
#[instruction(bumps: CreateGaugeBumps)]
pub struct CreateGauge<'info> {
    /// The pair associated with the gauge
    #[account(
        seeds = [
            b"pair",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = pair.bumps.pair,
        has_one = mint_a,
        has_one = mint_b
    )]
    pub pair: Account<'info, Pair>,

    /// The gauge
    #[account(
        init,
        payer = creator,
        seeds = [
            b"gauge",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.gauge
    )]
    pub gauge: Box<Account<'info, Gauge>>,

    /// The gauge authority
    #[account(
        mut,
        seeds = [
            b"authority",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the liquidity tokens
    #[account(constraint = mint_liquidity.key() == pair.pair_mint)]
    pub mint_liquidity: AccountInfo<'info>,

    /// The mint of the token representing liquidity
    #[account(
        init,
        payer = creator,
        seeds = [
            b"mint",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.mint,
        mint::decimals = 9,
        mint::authority = authority
    )]
    pub gauge_mint: Box<Account<'info, Mint>>,

    /// The mint of the gauge staking rewards
    pub mint_rewards: AccountInfo<'info>,

    /// The mint of the token A
    pub mint_a: AccountInfo<'info>,

    /// The mint of the token B
    pub mint_b: AccountInfo<'info>,

    /// The gauge account holding LP tokens
    #[account(
        init,
        payer = creator,
        seeds = [
            b"liquidity_account",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.account_liquidity,
        token::mint = mint_liquidity,
        token::authority = authority
    )]
    pub liquidity_account: Box<Account<'info, TokenAccount>>,

    /// The gauge account holding rewards tokens
    #[account(
        init,
        payer = creator,
        seeds = [
            b"rewards_account",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.account_rewards,
        token::mint = mint_rewards,
        token::authority = authority
    )]
    pub rewards_account: Box<Account<'info, TokenAccount>>,

    /// The gauge account holding token A
    #[account(
        init,
        payer = creator,
        seeds = [
            b"account_a",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.account_a,
        token::mint = mint_a,
        token::authority = authority
    )]
    pub account_a: Box<Account<'info, TokenAccount>>,

    /// The gauge account holding token B
    #[account(
        init,
        payer = creator,
        seeds = [
            b"account_b",
            mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bumps.account_b,
        token::mint = mint_b,
        token::authority = authority
    )]
    pub account_b: Box<Account<'info, TokenAccount>>,

    /// The creator of the gauge
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGauge>, bumps: CreateGaugeBumps) -> ProgramResult {
    let gauge = &mut ctx.accounts.gauge;
    gauge.pair = ctx.accounts.pair.key();
    gauge.mint_rewards = ctx.accounts.mint_rewards.key();
    gauge.gauge_mint = ctx.accounts.gauge_mint.key();
    gauge.authority = ctx.accounts.authority.key();
    gauge.bumps = bumps;

    msg!("Created gauge for pair {} and rewards={}", gauge.pair, gauge.mint_rewards);

    Ok(())
}
