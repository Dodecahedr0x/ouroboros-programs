use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token, TokenAccount};

use crate::state::{Locker, Ouroboros};

#[derive(Accounts)]
pub struct InitializeLocker<'info> {
    /// The Ouroboros
    #[account(
        mut,
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
    )]
    pub ouroboros: Account<'info, Ouroboros>,

    /// The Ouroboros authority
    #[account(
        mut,
        seeds = [
            b"authority",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the native token
    #[account(
        mut,
        seeds = [
            b"native",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.native
    )]
    pub native_mint: AccountInfo<'info>,

    /// The owner of the native tokens
    #[account(mut)]
    pub holder: AccountInfo<'info>,

    /// The owner of the native tokens
    #[account(
        mut,
        constraint = holder_account.owner == holder.key()
    )]
    pub holder_account: Account<'info, TokenAccount>,

    /// The locker
    #[account(
        mut,
        seeds = [
            b"locker",
            locker.id.as_ref()
        ],
        bump = locker.bumps.locker
    )]
    pub locker: Account<'info, Locker>,

    /// The account that will hold deposited tokens
    #[account(
        init,
        seeds = [
            b"locker_account",
            locker.id.as_ref()
        ],
        bump = locker.bumps.account,
        payer = holder,
        token::mint = native_mint,
        token::authority = authority
    )]
    pub locker_account: Account<'info, TokenAccount>,

    /// The wallet creating the Ouroboros
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeLocker<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.holder_account.to_account_info(),
                to: self.locker_account.to_account_info(),
                authority: self.holder.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<InitializeLocker>,
    period: u64,
    amount: u64,
) -> ProgramResult {
    let ouroboros = &ctx.accounts.ouroboros;
    let locker = &mut ctx.accounts.locker;
    locker.amount = amount;
    locker.votes = amount * period * ouroboros.time_multiplier / 604800 / 10000;
    locker.unlock_timestamp = ctx.accounts.clock.unix_timestamp + period as i64;

    let id_seed = ouroboros.id.to_le_bytes();
    let seeds = &[
        b"authority".as_ref(),
        id_seed.as_ref(),
        &[ouroboros.bumps.authority],
    ];
    let signer = &[&seeds[..]];

    token::transfer(ctx.accounts.transfer_context().with_signer(signer), amount)?;

    msg!("Locker created");

    Ok(())
}
