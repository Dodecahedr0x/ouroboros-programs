use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{CreatePairBumps, Pair};

#[derive(Accounts)]
#[instruction(bumps: CreatePairBumps)]
pub struct ClaimFees<'info> {
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

    /// The mint of the token A
    pub mint_a: AccountInfo<'info>,

    /// The mint of the token B
    pub mint_b: AccountInfo<'info>,

    /// The account holding fees on token A
    #[account(
        mut,
        seeds = [
            b"fees_a",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref()
        ],
        bump = pair.bumps.fees_a,
    )]
    pub fees_account_a: Account<'info, TokenAccount>,

    /// The account holding fees on token B
    #[account(
        mut,
        seeds = [
            b"fees_b",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref()
        ],
        bump = pair.bumps.fees_b,
    )]
    pub fees_account_b: Box<Account<'info, TokenAccount>>,

    /// The account providing liquidity
    #[account(mut)]
    pub liquidity_provider: Signer<'info>,

    /// The LP account holding fees of token A
    #[account(mut, constraint = lp_account_a.owner == liquidity_provider.key())]
    pub lp_account_a: Account<'info, TokenAccount>,

    /// The LP account holding fees of token B
    #[account(mut, constraint = lp_account_a.owner == liquidity_provider.key())]
    pub lp_account_b: Box<Account<'info, TokenAccount>>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClaimFees<'info> {
    fn transfer_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.fees_account_a.to_account_info(),
                to: self.lp_account_a.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn transfer_b_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.fees_account_b.to_account_info(),
                to: self.lp_account_b.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(ctx: Context<ClaimFees>) -> ProgramResult {
    let pair = &ctx.accounts.pair;
    let seeds = &[
        b"authority".as_ref(),
        pair.mint_a.as_ref(),
        pair.mint_b.as_ref(),
        &[pair.bumps.authority],
    ];
    let signer = &[&seeds[..]];
    token::transfer(
        ctx.accounts.transfer_a_context().with_signer(signer),
        ctx.accounts.fees_account_a.amount,
    )?;
    token::transfer(
        ctx.accounts.transfer_b_context().with_signer(signer),
        ctx.accounts.fees_account_b.amount,
    )?;

    msg!(
        "Sent {} {} to {} and {} {} to {}",
        ctx.accounts.fees_account_a.amount,
        ctx.accounts.fees_account_a.mint,
        ctx.accounts.lp_account_a.key(),
        ctx.accounts.fees_account_b.amount,
        ctx.accounts.fees_account_b.mint,
        ctx.accounts.lp_account_b.key(),
    );

    Ok(())
}
