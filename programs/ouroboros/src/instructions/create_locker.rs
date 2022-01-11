use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

use crate::state::{CreateLockerBumps, Locker, Ouroboros};

#[derive(Accounts)]
#[instruction(bumps: CreateLockerBumps, id: Pubkey)]
pub struct CreateLocker<'info> {
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
        init,
        seeds = [
            b"locker",
            id.as_ref()
        ],
        bump = bumps.locker,
        payer = holder
    )]
    pub locker: Account<'info, Locker>,

    /// The receipt NFT used to redeem the locker
    #[account(
        init,
        seeds = [
            b"receipt",
            id.as_ref()
        ],
        bump = bumps.locker,
        payer = authority,
        mint::decimals = 0,
        mint::authority = holder,
    )]
    pub receipt: Account<'info, Mint>,

    /// The account that will the receipt
    #[account(
        mut,
        constraint = receipt_account.owner == holder.key()
    )]
    pub receipt_account: Account<'info, TokenAccount>,

    /// The wallet creating the Ouroboros
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateLocker<'info> {
    fn mint_to_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.receipt.to_account_info(),
                to: self.receipt_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<CreateLocker>,
    bumps: CreateLockerBumps,
    id: Pubkey
) -> ProgramResult {
    let ouroboros = &ctx.accounts.ouroboros;
    let locker = &mut ctx.accounts.locker;
    locker.id = id;
    locker.receipt = ctx.accounts.receipt.key();
    locker.bumps = bumps;

    let id_seed = ouroboros.id.to_le_bytes();
    let seeds = &[
        b"authority".as_ref(),
        id_seed.as_ref(),
        &[ouroboros.bumps.authority],
    ];
    let signer = &[&seeds[..]];

    token::mint_to(ctx.accounts.mint_to_context().with_signer(signer), 1)?;
    
    msg!("Locker created");

    Ok(())
}
