use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::state::{Asset, Claimant, Locker, Ouroboros, Snapshot};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CollectFees<'info> {
    /// The Ouroboros
    #[account(
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
        has_one = authority
    )]
    pub ouroboros: Box<Account<'info, Ouroboros>>,

    /// The Ouroboros authority
    #[account(mut)]
    pub authority: AccountInfo<'info>,

    /// The locker collecting fees
    #[account(
        mut,
        seeds = [
            b"locker",
            ouroboros.id.to_le_bytes().as_ref(),
            locker.id.as_ref()
        ],
        bump = locker.bumps.locker
    )]
    pub locker: Box<Account<'info, Locker>>,

    /// The asset being claimed
    #[account(
        mut,
        seeds = [
            b"asset",
            ouroboros.id.to_le_bytes().as_ref(),
            asset.mint.as_ref()
        ],
        bump = asset.bumps.asset,
        has_one = mint
    )]
    pub asset: Box<Account<'info, Asset>>,

    /// The snapshot of the asset at the time the locker was created
    /// Or the earliest snapshot of the asset
    #[account(
        seeds = [
            b"snapshot",
            ouroboros.id.to_le_bytes().as_ref(),
            asset.mint.as_ref(),
            (current_snapshot.index - 1).to_le_bytes().as_ref()
        ],
        bump = current_snapshot.bump,
        has_one = mint,
        constraint = 
            previous_snapshot.timestamp < locker.creation_timestamp ||
            previous_snapshot.timestamp < claimant.last_claim
    )]
    pub previous_snapshot: Box<Account<'info, Snapshot>>,

    /// The snapshot being claimed
    /// Has to be started or finished
    #[account(
        mut,
        seeds = [
            b"snapshot",
            ouroboros.id.to_le_bytes().as_ref(),
            asset.mint.as_ref(),
            current_snapshot.index.to_le_bytes().as_ref()
        ],
        bump = current_snapshot.bump,
        has_one = mint,
        constraint = 
            current_snapshot.index == previous_snapshot.index + 1 &&
            current_snapshot.timestamp > claimant.last_claim
    )]
    pub current_snapshot: Box<Account<'info, Snapshot>>,

    /// The mint of the asset being claimed
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    /// The account that stores the fees
    #[account(
        mut,
        seeds = [
            b"asset_account",
            ouroboros.id.to_le_bytes().as_ref(),
            asset.mint.as_ref()
        ],
        bump = asset.bumps.account
    )]
    pub ouroboros_account: Box<Account<'info, TokenAccount>>,

    /// The account claiming the fees
    pub holder: Signer<'info>,

    /// The account tracking locker's claims
    #[account(
        init_if_needed,
        payer = holder,
        seeds = [
            b"claimant",
            ouroboros.id.to_le_bytes().as_ref(),
            asset.mint.as_ref(),
            locker.key().as_ref()
        ],
        bump = bump
    )]
    pub claimant: Box<Account<'info, Claimant>>,

    /// The account that will receive the fees
    #[account(
        init_if_needed,
        payer = holder,
        associated_token::mint = mint,
        associated_token::authority = holder,
    )]
    pub holder_account: Box<Account<'info, TokenAccount>>,

    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> CollectFees<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.ouroboros_account.to_account_info(),
                to: self.holder_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(ctx: Context<CollectFees>, bump: u8) -> ProgramResult {
    let ouroboros = &ctx.accounts.ouroboros;
    let claimant = &mut ctx.accounts.claimant;

    let previous_snapshot = &ctx.accounts.previous_snapshot;
    let current_snapshot = &mut ctx.accounts.current_snapshot;

    // Uninitialized claimant
    if claimant.mint != ctx.accounts.mint.key() {
        claimant.owner = ctx.accounts.locker.key();
        claimant.mint = ctx.accounts.mint.key();
        claimant.last_claim = previous_snapshot.timestamp;
        claimant.bump = bump;
    }

    let collectible_rewards = previous_snapshot.rewards * 10_u64.pow(9) * 
        (current_snapshot.timestamp - claimant.last_claim) as u64 / ouroboros.period / previous_snapshot.rewards;

    claimant.last_claim = {
        if ctx.accounts.clock.unix_timestamp < current_snapshot.timestamp {
            ctx.accounts.clock.unix_timestamp
        } else {
            current_snapshot.timestamp
        }
    };

    token::transfer(ctx.accounts.transfer_context(), collectible_rewards)?;

    msg!(
        "Sent {} fees of {} to {}",
        collectible_rewards,
        ctx.accounts.mint.key(),
        ctx.accounts.holder_account.key(),
    );

    Ok(())
}
