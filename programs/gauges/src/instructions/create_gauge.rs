use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::state::{CreateGaugeBumps, Gauge};

#[derive(Accounts)]
#[instruction(bumps: CreateGaugeBumps)]
pub struct CreateGauge<'info> {
    /// The gauge
    #[account(
        init,
        payer = creator,
        seeds = [
            b"gauge",
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
        ],
        bump = bumps.gauge
    )]
    pub gauge: Box<Account<'info, Gauge>>,

    /// The gauge authority
    #[account(
        mut,
        seeds = [
            b"authority",
            mint_a.key().as_ref(),
            mint_b.key().as_ref()
        ],
        bump = bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the token representing liquidity
    #[account(
        init,
        payer = creator,
        seeds = [
            b"mint",
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
        ],
        bump = bumps.mint,
        mint::decimals = 9,
        mint::authority = authority
    )]
    pub gauge_mint: Box<Account<'info, Mint>>,

    /// The mint of the token A
    pub mint_a: AccountInfo<'info>,

    /// The mint of the token B
    pub mint_b: AccountInfo<'info>,

    /// The gauge account holding token A
    #[account(
        init,
        payer = creator,
        seeds = [
            b"account_a",
            mint_a.key().as_ref(),
            mint_b.key().as_ref()
        ],
        bump = bumps.account_a,
        token::mint = mint_a,
        token::authority = authority
    )]
    pub gauge_account_a: Box<Account<'info, TokenAccount>>,

    /// The gauge account holding token B
    #[account(
        init,
        payer = creator,
        seeds = [
            b"account_b",
            mint_a.key().as_ref(),
            mint_b.key().as_ref()
        ],
        bump = bumps.account_b,
        token::mint = mint_b,
        token::authority = authority
    )]
    pub gauge_account_b: Box<Account<'info, TokenAccount>>,

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
    gauge.mint_a = ctx.accounts.mint_a.key();
    gauge.mint_b = ctx.accounts.mint_b.key();
    gauge.pair_mint = ctx.accounts.gauge_mint.key();
    gauge.authority = ctx.accounts.authority.key();
    gauge.bumps = bumps;

    msg!("Created gauge for token A={} and B={}", gauge.mint_a, gauge.mint_b);

    Ok(())
}
