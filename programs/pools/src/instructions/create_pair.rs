use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::state::{CreatePairBumps, Pair};

#[derive(Accounts)]
#[instruction(bumps: CreatePairBumps)]
pub struct CreatePair<'info> {
    /// The pair
    #[account(
        init,
        payer = creator,
        seeds = [
            b"pair",
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
        ],
        bump = bumps.pair
    )]
    pub pair: Box<Account<'info, Pair>>,

    /// The pair authority
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
        mint::decimals = 0,
        mint::authority = authority
    )]
    pub pair_mint: Box<Account<'info, Mint>>,

    /// The mint of the token A
    pub mint_a: AccountInfo<'info>,

    /// The mint of the token B
    pub mint_b: AccountInfo<'info>,

    /// The pair account holding token A
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
    pub pair_account_a: Box<Account<'info, TokenAccount>>,

    /// The pair account holding token B
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
    pub pair_account_b: Box<Account<'info, TokenAccount>>,

    /// The account holding fees on token A
    #[account(
        init,
        payer = creator,
        seeds = [
            b"fees_a",
            mint_a.key().as_ref(),
            mint_b.key().as_ref()
        ],
        bump = bumps.fees_a,
        token::mint = mint_a,
        token::authority = authority
    )]
    pub fees_account_a: Account<'info, TokenAccount>,

    /// The account holding fees on token B
    #[account(
        init,
        payer = creator,
        seeds = [
            b"fees_b",
            mint_a.key().as_ref(),
            mint_b.key().as_ref()
        ],
        bump = bumps.fees_b,
        token::mint = mint_b,
        token::authority = authority
    )]
    pub fees_account_b: Box<Account<'info, TokenAccount>>,

    /// The creator of the pool
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreatePair>, bumps: CreatePairBumps, stable: bool) -> ProgramResult {
    let pair = &mut ctx.accounts.pair;
    pair.mint_a = ctx.accounts.mint_a.key();
    pair.mint_b = ctx.accounts.mint_b.key();
    pair.stable = stable;
    pair.pair_mint = ctx.accounts.pair_mint.key();
    pair.authority = ctx.accounts.authority.key();
    pair.bumps = bumps;

    msg!("Created pair for token A={} and B={}", pair.mint_a, pair.mint_b);

    Ok(())
}
