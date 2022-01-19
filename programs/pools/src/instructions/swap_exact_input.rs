use anchor_lang::prelude::*;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::ErrorCode;
use crate::state::Pair;

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct SwapExactInput<'info> {
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
    pub mint_a: Box<Account<'info, Mint>>,

    /// The mint of the token B
    #[account(mut, address = pair.mint_b)]
    pub mint_b: Box<Account<'info, Mint>>,

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

    /// The wallet doing the swap
    #[account(mut)]
    pub swapper: Signer<'info>,

    /// The swapper's token A account
    #[account(
        init_if_needed,
        payer = swapper,
        associated_token::mint = mint_a,
        associated_token::authority = swapper
    )]
    pub account_a: Box<Account<'info, TokenAccount>>,

    /// The swapper's token B account
    #[account(
        init_if_needed,
        payer = swapper,
        associated_token::mint = mint_b,
        associated_token::authority = swapper
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

impl<'info> SwapExactInput<'info> {
    fn transfer_a_to_swapper_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pair_account_a.to_account_info(),
                to: self.account_a.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn transfer_b_to_swapper_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.pair_account_b.to_account_info(),
                to: self.account_b.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn transfer_a_from_swapper_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_a.to_account_info(),
                to: self.pair_account_a.to_account_info(),
                authority: self.swapper.to_account_info(),
            },
        )
    }

    fn transfer_b_from_swapper_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_b.to_account_info(),
                to: self.pair_account_b.to_account_info(),
                authority: self.swapper.to_account_info(),
            },
        )
    }

    fn transfer_fees_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_a.to_account_info(),
                to: self.fees_account_a.to_account_info(),
                authority: self.swapper.to_account_info(),
            },
        )
    }

    fn transfer_fees_b_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.account_b.to_account_info(),
                to: self.fees_account_b.to_account_info(),
                authority: self.swapper.to_account_info(),
            },
        )
    }
}

fn get_amount_out(amount_in: u64, reserve_in: u64, reserve_out: u64) -> u64 {
    let amount_in_with_fees = amount_in * 999 / 1000;
    let numerator = amount_in_with_fees * reserve_out;
    let denominator = reserve_in * 1000 + amount_in_with_fees;
    numerator / denominator
}

fn k(x: u64, x_decimals: u8, y: u64, y_decimals: u8, stable: bool) -> u64 {
    if stable {
        let _x = x * 10_u64.pow(9) / x_decimals as u64;
        let _y = y * 10_u64.pow(9) / y_decimals as u64;
        let _a = (_x * _y) / 10_u64.pow(9);
        let _b = (_x * _x) / 10_u64.pow(9) + (_y * _y) / 10_u64.pow(9);
        return _a * _b / 10_u64.pow(9) / 2; // x3y+y3x >= k
    } else {
        return x * y; // xy >= k
    }
}

pub fn handler(
    ctx: Context<SwapExactInput>,
    amount_in_a: u64,
    amount_in_b: u64,
    min_amount_out_a: u64,
    min_amount_out_b: u64,
) -> ProgramResult {
    if amount_in_a == 0 && amount_in_b == 0 {
        return Err(ErrorCode::InsufficientInput.into());
    }

    let pair = &ctx.accounts.pair;

    let reserve_a = ctx.accounts.pair_account_a.amount;
    let reserve_b = ctx.accounts.pair_account_b.amount;

    if min_amount_out_a > reserve_a || min_amount_out_b > reserve_b {
        return Err(ErrorCode::InsufficientLiquidity.into());
    }

    // Transfer tokens and take fees
    if amount_in_a > 0 {
        token::transfer(
            ctx.accounts.transfer_a_from_swapper_context(),
            amount_in_a - amount_in_a / 1000,
        )?;
        token::transfer(ctx.accounts.transfer_fees_a_context(), amount_in_a / 1000)?;
    }
    if amount_in_b > 0 {
        token::transfer(
            ctx.accounts.transfer_b_from_swapper_context(),
            amount_in_b - amount_in_b / 1000,
        )?;
        token::transfer(ctx.accounts.transfer_fees_b_context(), amount_in_b / 1000)?;
    }

    let amount_out_a = get_amount_out(amount_in_b, reserve_b, reserve_a);
    let amount_out_b = get_amount_out(amount_in_a, reserve_a, reserve_b);
    
    let seeds = &[
        b"authority".as_ref(),
        pair.mint_a.as_ref(),
        pair.mint_b.as_ref(),
        &[pair.bumps.authority],
    ];
    let signer = &[&seeds[..]];

    msg!("Amount a={}; amount b={}", amount_out_a, amount_out_b);

    if amount_out_a > 0 {
        token::transfer(
            ctx.accounts
                .transfer_a_to_swapper_context()
                .with_signer(signer),
            amount_out_a,
        )?;
    }
    if amount_out_b > 0 {
        token::transfer(
            ctx.accounts
                .transfer_b_to_swapper_context()
                .with_signer(signer),
            amount_out_b,
        )?;
    }

    let new_reserve_a = reserve_a - amount_out_a;
    let new_reserve_b = reserve_b - amount_out_b;

    // TODO: Only works with 9 decimals tokens
    if k(
        new_reserve_a + amount_in_a - amount_in_a / 1000,
        ctx.accounts.mint_a.decimals,
        new_reserve_b + amount_in_b - amount_in_b / 1000,
        ctx.accounts.mint_b.decimals,
        pair.stable,
    ) < k(reserve_a, ctx.accounts.mint_a.decimals, reserve_b, ctx.accounts.mint_b.decimals, pair.stable)
    {
        return Err(ErrorCode::InvariantK.into());
    }

    msg!(
        "Swapped {} {} for {} {}",
        amount_in_a,
        ctx.accounts.mint_a.key(),
        amount_out_b,
        ctx.accounts.mint_b.key()
    );
    msg!(
        "Swapped {} {} for {} {}",
        amount_in_b,
        ctx.accounts.mint_b.key(),
        amount_out_a,
        ctx.accounts.mint_a.key()
    );

    Ok(())
}
