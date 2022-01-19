use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::state::{Beneficiary, Locker, Ouroboros};

#[derive(Accounts)]
pub struct CastVote<'info> {
    /// The Ouroboros
    #[account(
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
    )]
    pub ouroboros: Box<Account<'info, Ouroboros>>,

    /// The beneficiary of the ouroboros incentives receiving votes
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary.account.as_ref()
        ],
        bump = beneficiary.bump
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    /// The last beneficiary
    /// Can be the same as beneficiary if it's the first vote
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            old_beneficiary.account.as_ref()
        ],
        bump = old_beneficiary.bump
    )]
    pub old_beneficiary: Box<Account<'info, Beneficiary>>,

    /// The locker used to vote
    #[account(
        mut,
        seeds = [
            b"locker",
            locker.id.as_ref()
        ],
        bump = locker.bumps.locker
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

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CastVote>) -> ProgramResult {
    let locker = &mut ctx.accounts.locker;
    
    let beneficiary = &mut ctx.accounts.beneficiary;
    beneficiary.votes += locker.votes;

    msg!("ben {}, {}, {}", locker.beneficiary, beneficiary.votes, locker.votes);

    if locker.beneficiary != Pubkey::default() {
        let old_beneficiary = &mut ctx.accounts.old_beneficiary;
        old_beneficiary.votes -= locker.votes;
    }

    locker.beneficiary = ctx.accounts.beneficiary.key();
    
    msg!(
        "Cast vote of locker {} for beneficiary {} with {} votes",
        ctx.accounts.locker.key(),
        ctx.accounts.beneficiary.key(),
        ctx.accounts.locker.votes
    );

    Ok(())
}
