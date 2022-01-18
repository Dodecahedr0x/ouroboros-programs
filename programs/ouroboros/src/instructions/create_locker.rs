use anchor_lang::prelude::*;
use anchor_spl::associated_token;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::state::{CreateLockerBumps, Locker, Ouroboros};

#[derive(Accounts)]
#[instruction(bumps: CreateLockerBumps, id: Pubkey)]
pub struct CreateLocker<'info> {
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

    /// The locker
    #[account(
        init,
        seeds = [
            b"locker",
            id.as_ref()
        ],
        bump = bumps.locker,
        payer = creator
    )]
    pub locker: Box<Account<'info, Locker>>,

    /// The account that will hold deposited tokens
    #[account(
        init,
        seeds = [
            b"locker_account",
            id.as_ref()
        ],
        bump = bumps.account,
        payer = creator,
        token::mint = native_mint,
        token::authority = authority
    )]
    pub locker_account: Box<Account<'info, TokenAccount>>,

    /// The owner of the native tokens
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The owner account for native tokens
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = native_mint,
        associated_token::authority = creator,
    )]
    pub creator_account: Box<Account<'info, TokenAccount>>,

    /// The receipt NFT used to redeem the locker
    #[account(
        init,
        seeds = [
            b"receipt",
            id.as_ref()
        ],
        bump = bumps.receipt,
        payer = creator,
        mint::decimals = 0,
        mint::authority = authority
    )]
    pub receipt: Box<Account<'info, Mint>>,

    /// The account that will hold the receipt
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = receipt,
        associated_token::authority = creator,
    )]
    pub receipt_account: Box<Account<'info, TokenAccount>>,

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

    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.creator_account.to_account_info(),
                to: self.locker_account.to_account_info(),
                authority: self.creator.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<CreateLocker>,
    bumps: CreateLockerBumps,
    id: Pubkey,
    amount: u64,
    period: u64,
) -> ProgramResult {
    let ouroboros = &ctx.accounts.ouroboros;
    let locker = &mut ctx.accounts.locker;
    locker.id = id;
    locker.receipt = ctx.accounts.receipt.key();
    locker.amount = amount;
    locker.votes = amount * period * ouroboros.time_multiplier / 604800 / 10000;
    locker.unlock_timestamp = ctx.accounts.clock.unix_timestamp + period as i64;
    locker.bumps = bumps;

    let id_seed = ouroboros.id.to_le_bytes();
    let seeds = &[
        b"authority".as_ref(),
        id_seed.as_ref(),
        &[ouroboros.bumps.authority],
    ];
    let signer = &[&seeds[..]];

    token::transfer(ctx.accounts.transfer_context().with_signer(signer), amount)?;
    token::mint_to(ctx.accounts.mint_to_context().with_signer(signer), 1)?;

    msg!("Locker created");

    Ok(())
}
