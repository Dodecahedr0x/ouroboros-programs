use spl_math::approximations;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Transfer, Token, TokenAccount};
use anchor_spl::associated_token::{self, AssociatedToken};

use crate::MINIMUM_LIQUIDITY;
use crate::errors::ErrorCode;
use crate::state::{Pair};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct AddLiquidity<'info> {
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

    /// The account holding the minimum liquidity
    #[account(
        init_if_needed,
        payer = liquidity_provider,
        seeds = [
            b"burner",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = bump,
        token::mint = pair_mint,
        token::authority = authority
    )]
    pub burner_account: Box<Account<'info, TokenAccount>>,

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
    #[account(
        init_if_needed,
        payer = liquidity_provider,
        associated_token::mint = pair_mint,
        associated_token::authority = liquidity_provider
    )]
    pub liquidity_provider_account: Box<Account<'info, TokenAccount>>,

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

    /// The program for interacting with associated tokens accoutns.
    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The program for interacting with tokens.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> AddLiquidity<'info> {
    fn transfer_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_a.to_account_info(),
                to: self.pair_account_a.to_account_info(),
                authority: self.liquidity_provider.to_account_info(),
            },
        )
    }

    fn transfer_b_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_b.to_account_info(),
                to: self.pair_account_b.to_account_info(),
                authority: self.liquidity_provider.to_account_info(),
            },
        )
    }

    fn mint_liquidity_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.pair_mint.to_account_info(),
                to: self.liquidity_provider_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn mint_burned_liquidity_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.pair_mint.to_account_info(),
                to: self.burner_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

fn quote(amount_a: u64, reserve_a: u64, reserve_b: u64) -> u64 {
    amount_a * reserve_b / reserve_a
}

pub fn handler(
    ctx: Context<AddLiquidity>,
    _bump: u8,
    desired_amount_a: u64,
    desired_amount_b: u64,
    min_amount_a: u64,
    min_amount_b: u64,
) -> ProgramResult {
    let pair = &ctx.accounts.pair;

    let reserve_a = ctx.accounts.pair_account_a.amount;
    let reserve_b = ctx.accounts.pair_account_b.amount;

    // Computing optimal liquidity respecting the constraints
    let (amount_a, amount_b) = {
        if reserve_a == 0 && reserve_b == 0 {
            (desired_amount_a, desired_amount_b)
        } else {
            if desired_amount_a == 0 {
                return Err(ErrorCode::InsufficientAmount.into())
            }
            if reserve_a == 0 && reserve_b == 0 {
                return Err(ErrorCode::InsufficientLiquidity.into())
            }

            let amount_b_optimal = quote(desired_amount_a, reserve_a, reserve_b);
            if amount_b_optimal <= desired_amount_b {
                if amount_b_optimal < min_amount_b {
                    return Err(ErrorCode::InsufficientAmount.into())
                }
                (desired_amount_a, amount_b_optimal)
            } else {
                let amount_a_optimal = quote(desired_amount_b, reserve_b, reserve_a);
                if amount_a_optimal < min_amount_a {
                    return Err(ErrorCode::InsufficientAmount.into())
                }
                (amount_a_optimal, desired_amount_b)
            }
        }
    };

    token::transfer(ctx.accounts.transfer_a_context(), amount_a)?;
    token::transfer(ctx.accounts.transfer_b_context(), amount_b)?;

    let liquidity = {
        if ctx.accounts.pair_mint.supply == 0 {
            approximations::sqrt(amount_a * amount_b).unwrap() - MINIMUM_LIQUIDITY
        } else {
            let lhs = amount_a * ctx.accounts.pair_mint.supply / reserve_a;
            let rhs = amount_b * ctx.accounts.pair_mint.supply / reserve_b;
            if lhs > rhs {
                rhs
            } else {
                lhs
            }
        }
    };
    if liquidity == 0 {
        return Err(ErrorCode::InsufficientLiquidityMinted.into())
    }

    let seeds = &[
        b"authority".as_ref(),
        pair.mint_a.as_ref(),
        pair.mint_b.as_ref(),
        &[pair.bumps.authority],
    ];
    let signer = &[&seeds[..]];
    token::mint_to(ctx.accounts.mint_liquidity_context().with_signer(signer), liquidity)?;
    token::mint_to(
        ctx.accounts.mint_burned_liquidity_context().with_signer(signer), 
        MINIMUM_LIQUIDITY
    )?;

    msg!("Provided {} liquidity to pair A={} and B={}", liquidity, pair.mint_a, pair.mint_b);

    Ok(())
}
