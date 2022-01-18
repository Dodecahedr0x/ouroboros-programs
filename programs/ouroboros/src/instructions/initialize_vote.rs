use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::state::{Beneficiary, Locker, Ouroboros};

#[derive(Accounts)]
pub struct InitializeVote<'info> {
    /// The Ouroboros
    #[account(
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
    )]
    pub ouroboros: Box<Account<'info, Ouroboros>>,

    /// The beneficiary of the ouroboros
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary.account.as_ref()
        ],
        bump = beneficiary.bump
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    /// The locker used to vote
    #[account(
        mut,
        seeds = [
            b"locker",
            locker.id.as_ref()
        ],
        bump = locker.bumps.locker,
        constraint = locker.beneficiary == Pubkey::default()
    )]
    pub locker: Box<Account<'info, Locker>>,

    /// The wallet voting for the beneficiary
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The account holding the locker receipt
    #[account(
        constraint = 
            receipt_account.owner == voter.key() &&
            receipt_account.amount == 1
    )]
    pub receipt_account: Box<Account<'info, TokenAccount>>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeVote>) -> ProgramResult {
    let locker = &mut ctx.accounts.locker;
    locker.beneficiary = ctx.accounts.beneficiary.key();

    let beneficiary = &mut ctx.accounts.beneficiary;
    beneficiary.votes += locker.votes;

    msg!(
        "Initialized vote of locker {} for beneficiary {}",
        ctx.accounts.locker.key(),
        ctx.accounts.beneficiary.key()
    );

    Ok(())
}
