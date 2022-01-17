use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Transfer, Token, TokenAccount, Burn};

use crate::state::Pair;

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    /// The pair
    #[account(
        seeds = [
            b"pair",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = pair.bumps.pair,
    )]
    pub pair: Account<'info, Pair>,

    /// The pair authority
    #[account(
        mut,
        seeds = [
            b"authority",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref()
        ],
        bump = pair.bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the token representing liquidity
    #[account(
        mut,
        seeds = [
            b"mint",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = pair.bumps.mint,
    )]
    pub pair_mint: Box<Account<'info, Mint>>,

    /// The mint of the token A
    #[account(mut, address = pair.mint_a)]
    pub mint_a: AccountInfo<'info>,

    /// The mint of the token B
    #[account(mut, address = pair.mint_b)]
    pub mint_b: AccountInfo<'info>,

    /// The pair account holding token A
    #[account(
        mut,
        seeds = [
            b"account_a",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref()
        ],
        bump = pair.bumps.account_a,
    )]
    pub pair_account_a: Account<'info, TokenAccount>,

    /// The pair account holding token B
    #[account(
        mut,
        seeds = [
            b"account_b",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref()
        ],
        bump = pair.bumps.account_b,
    )]
    pub pair_account_b: Box<Account<'info, TokenAccount>>,

    /// The account providing liquidity
    #[account(mut)]
    pub liquidity_provider: Signer<'info>,

    /// The holding liquidity tokens
    /// Not initializing to save stack
    #[account(mut)]
    pub liquidity_provider_account: AccountInfo<'info>,

    /// The account holding liquidity for token A
    #[account(
        mut,
        constraint = 
            account_a.owner == liquidity_provider.key() &&
            account_a.mint == pair.mint_a
    )]
    pub account_a: Box<Account<'info, TokenAccount>>,

    /// The account holding liquidity for token A
    #[account(
        mut,
        constraint = 
            account_b.owner == liquidity_provider.key() &&
            account_b.mint == pair.mint_b
    )]
    pub account_b: Box<Account<'info, TokenAccount>>,

    /// The program for interacting with tokens.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> RemoveLiquidity<'info> {
    fn transfer_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pair_account_a.to_account_info(),
                to: self.account_a.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn transfer_b_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pair_account_b.to_account_info(),
                to: self.account_b.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn burn_liquidity_context(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.pair_mint.to_account_info(),
                to: self.liquidity_provider_account.to_account_info(),
                authority: self.liquidity_provider.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<RemoveLiquidity>,
    liquidity: u64,
) -> ProgramResult {
    let pair = &ctx.accounts.pair;

    let reserve_a = ctx.accounts.pair_account_a.amount;
    let reserve_b = ctx.accounts.pair_account_b.amount;
    let supply = ctx.accounts.pair_mint.supply;

    let amount_a = liquidity * reserve_a / supply;
    let amount_b = liquidity * reserve_b / supply;

    let seeds = &[
        b"authority".as_ref(),
        pair.mint_a.as_ref(),
        pair.mint_b.as_ref(),
        &[pair.bumps.authority],
    ];
    let signer = &[&seeds[..]];
    token::transfer(ctx.accounts.transfer_a_context().with_signer(signer), amount_a)?;
    token::transfer(ctx.accounts.transfer_b_context().with_signer(signer), amount_b)?;
    token::burn(ctx.accounts.burn_liquidity_context().with_signer(signer), liquidity)?;

    msg!("Removed {} liquidity to pair A={} and B={}", liquidity, pair.mint_a, pair.mint_b);

    Ok(())
}
