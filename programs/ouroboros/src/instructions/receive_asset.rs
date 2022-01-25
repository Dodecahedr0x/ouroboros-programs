use anchor_lang::prelude::*;
use anchor_spl::associated_token;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    state::{Asset, AssetBumps, Ouroboros, Snapshot},
};

#[derive(Accounts)]
#[instruction(bumps: AssetBumps, snapshot_bump: u8, snapshot_index: u64)]
pub struct ReceiveAsset<'info> {
    /// The Ouroboros
    #[account(
        mut,
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
    )]
    pub ouroboros: Box<Account<'info, Ouroboros>>,

    /// The asset being claimed
    #[account(
        init_if_needed,
        payer = sender,
        seeds = [
            b"asset",
            ouroboros.id.to_le_bytes().as_ref(),
            mint.key().as_ref()
        ],
        bump = bumps.asset,
        constraint = asset.last_snapshot_index == snapshot_index
    )]
    pub asset: Box<Account<'info, Asset>>,

    /// The asset authority
    #[account(
        mut,
        seeds = [
            b"asset_authority",
            ouroboros.id.to_le_bytes().as_ref(),
            mint.key().as_ref()
        ],
        bump = bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The snapshot assets are added to
    #[account(
        init_if_needed,
        payer = sender,
        seeds = [
            b"snapshot",
            ouroboros.id.to_le_bytes().as_ref(),
            mint.key().as_ref(),
            snapshot_index.to_le_bytes().as_ref()
        ],
        bump = snapshot_bump
    )]
    pub current_snapshot: Box<Account<'info, Snapshot>>,

    /// The mint of the asset being claimed
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    /// The account that stores the fees
    #[account(
        init_if_needed,
        payer = sender,
        seeds = [
            b"asset_account",
            ouroboros.id.to_le_bytes().as_ref(),
            mint.key().as_ref()
        ],
        bump = bumps.account,
        token::mint = mint,
        token::authority = authority,
    )]
    pub ouroboros_account: Box<Account<'info, TokenAccount>>,

    /// The wallet that sends the fees
    #[account(mut)]
    pub sender: Signer<'info>,

    // /// The account that pays the fees
    #[account(
        init_if_needed,
        payer = sender,
        associated_token::mint = mint,
        associated_token::authority = sender,
    )]
    pub sender_account: Box<Account<'info, TokenAccount>>,

    /// The program for interacting with the associated tokens.
    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> ReceiveAsset<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.sender_account.to_account_info(),
                to: self.ouroboros_account.to_account_info(),
                authority: self.sender.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<ReceiveAsset>,
    bumps: AssetBumps,
    snapshot_bump: u8,
    snapshot_index: u64,
    amount: u64,
) -> ProgramResult {
    let ouroboros = &mut ctx.accounts.ouroboros;
    let asset = &mut ctx.accounts.asset;

    if ctx.accounts.clock.unix_timestamp >= ouroboros.last_period + (ouroboros.period as i64) {
        ouroboros.last_period += ouroboros.period as i64;
        ouroboros.last_period_votes += ouroboros.total_votes;
    }

    // Uninitialized asset
    if asset.mint != ctx.accounts.mint.key() {
        asset.mint = ctx.accounts.mint.key();
        asset.authority = ctx.accounts.authority.key();
        asset.reward_height += amount;
        asset.last_update = ouroboros.last_period;
        asset.bumps = bumps;
    }

    let current_snapshot = &mut ctx.accounts.current_snapshot;

    // Uninitialized snapshot
    if current_snapshot.timestamp == 0 {
        current_snapshot.mint = ctx.accounts.mint.key();
        current_snapshot.timestamp = ouroboros.last_period + ouroboros.period as i64;
        current_snapshot.index = asset.last_snapshot_index;
        current_snapshot.bump = snapshot_bump;
    } else if current_snapshot.timestamp != ouroboros.last_period + ouroboros.period as i64
        || current_snapshot.index != snapshot_index
    {
        return Err(ErrorCode::InvalidSnapshot.into());
    }

    if asset.last_update + (ouroboros.period as i64) < ctx.accounts.clock.unix_timestamp {
        asset.last_update += ouroboros.period as i64;
        asset.last_snapshot_index += 1;
    }

    current_snapshot.rewards += amount;
    current_snapshot.votes = ouroboros.total_votes;
    token::transfer(ctx.accounts.transfer_context(), amount)?;

    msg!("Received {} of asset {}", amount, ctx.accounts.mint.key());

    Ok(())
}
