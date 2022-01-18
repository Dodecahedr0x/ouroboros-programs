use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use anchor_spl::associated_token::{self, AssociatedToken};

use pools::state::Pair;
use crate::state::{Gauge, Staker};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CollectRewards<'info> {
    /// The pair associated with the gauge
    #[account(
        seeds = [
            b"pair",
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = pair.bumps.pair,
    )]
    pub pair: Account<'info, Pair>,

    /// The gauge
    #[account(
        mut,
        seeds = [
            b"gauge",
            gauge.mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = gauge.bumps.gauge,
        has_one = pair,
    )]
    pub gauge: Box<Account<'info, Gauge>>,

    /// The gauge authority
    #[account(
        mut,
        seeds = [
            b"authority",
            gauge.mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = gauge.bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the liquidity tokens
    #[account(constraint = mint_liquidity.key() == pair.pair_mint)]
    pub mint_liquidity: AccountInfo<'info>,

    /// The mint of the token representing liquidity
    #[account(
        mut,
        seeds = [
            b"mint",
            gauge.mint_rewards.key().as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = gauge.bumps.mint,
    )]
    pub gauge_mint: Box<Account<'info, Mint>>,

    /// The gauge that will receive LP tokens
    #[account(
        mut,
        seeds = [
            b"liquidity_account",
            gauge.mint_rewards.as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
        ],
        bump = gauge.bumps.account_liquidity,
    )]
    pub gauge_liquidity_account: Box<Account<'info, TokenAccount>>,

    /// The liquidity provider
    #[account(mut)]
    pub liquidity_provider: Signer<'info>,

    /// The staker account owner by the liquidity_provider
    #[account(
        init_if_needed,
        payer = liquidity_provider,
        seeds = [
            b"staker",
            gauge.mint_rewards.as_ref(),
            pair.mint_a.as_ref(),
            pair.mint_b.as_ref(),
            liquidity_provider.key().as_ref()
        ],
        bump = bump
    )]
    pub staker: Box<Account<'info, Staker>>,

    /// The account that holds LP tokens
    #[account(
        init_if_needed,
        payer = liquidity_provider,
        associated_token::mint = mint_liquidity,
        associated_token::authority = liquidity_provider
    )]
    pub liquidity_provider_account: Box<Account<'info, TokenAccount>>,

    /// The program for interacting with associated tokens accoutns.
    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> CollectRewards<'info> {
    fn transfer_a_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.liquidity_provider_account.to_account_info(),
                to: self.gauge_liquidity_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }

    fn mint_to_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.gauge_mint.to_account_info(),
                to: self.gauge_liquidity_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(ctx: Context<CollectRewards>, _bump: u8, amount: u64) -> ProgramResult {
    token::transfer(ctx.accounts.transfer_a_context(), amount)?;

    let pair = &ctx.accounts.pair;
    let gauge = &ctx.accounts.gauge;
    let seeds = &[
        b"authority".as_ref(),
        gauge.mint_rewards.as_ref(),
        pair.mint_a.as_ref(),
        pair.mint_b.as_ref(),
        &[gauge.bumps.authority],
    ];
    let signer = &[&seeds[..]];
    token::mint_to(ctx.accounts.mint_to_context().with_signer(signer), amount)?;

    msg!("Deposited {} tokens for gauge {}", amount, ctx.accounts.gauge.key());

    Ok(())
}
