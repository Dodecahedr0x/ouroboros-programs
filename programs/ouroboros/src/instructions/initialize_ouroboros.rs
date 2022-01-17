use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{self, Mint, MintTo, Token, TokenAccount},
};

use crate::state::{InitializeOuroborosBumps, Ouroboros};

#[derive(Accounts)]
#[instruction(bumps: InitializeOuroborosBumps, ouroboros_id: u64)]
pub struct InitializeOuroboros<'info> {
    /// The Ouroboros
    #[account(
        init,
        payer = creator,
        seeds = [
            b"ouroboros",
            ouroboros_id.to_le_bytes().as_ref()
        ],
        bump = bumps.ouroboros,
    )]
    pub ouroboros: Account<'info, Ouroboros>,

    /// The Ouroboros authority
    #[account(
        mut,
        seeds = [
            b"authority",
            ouroboros_id.to_le_bytes().as_ref()
        ],
        bump = bumps.authority
    )]
    pub authority: AccountInfo<'info>,

    /// The mint of the native token
    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = authority,
        seeds = [
            b"native",
            ouroboros_id.to_le_bytes().as_ref()
        ],
        bump = bumps.native
    )]
    pub native_mint: Account<'info, Mint>,

    /// The mint of the locked token
    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = authority,
        seeds = [
            b"locked",
            ouroboros_id.to_le_bytes().as_ref()
        ],
        bump = bumps.locked
    )]
    pub locked_mint: Account<'info, Mint>,

    /// The wallet creating the Ouroboros
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The account that will receive the initial supply
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = native_mint,
        associated_token::authority = creator,
    )]
    pub creator_account: Account<'info, TokenAccount>,

    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The program for interacting with tokens.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeOuroboros<'info> {
    fn mint_to_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.native_mint.to_account_info(),
                to: self.creator_account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(
    ctx: Context<InitializeOuroboros>,
    bumps: InitializeOuroborosBumps,
    ouroboros_id: u64,
    initial_supply: u64,
    base_weekly_emissions: u64,
    time_multiplier: u64,
) -> ProgramResult {
    let ouroboros = &mut ctx.accounts.ouroboros;
    ouroboros.id = ouroboros_id;
    ouroboros.authority = ctx.accounts.authority.key();
    ouroboros.native_mint = ctx.accounts.native_mint.key();
    ouroboros.locked_mint = ctx.accounts.locked_mint.key();
    ouroboros.base_emissions = base_weekly_emissions;
    ouroboros.time_multiplier = time_multiplier;
    ouroboros.bumps = bumps;

    let id_seed = ouroboros.id.to_le_bytes();
    let seeds = &[
        b"authority".as_ref(),
        id_seed.as_ref(),
        &[ouroboros.bumps.authority],
    ];
    let signer = &[&seeds[..]];

    token::mint_to(
        ctx.accounts.mint_to_context().with_signer(signer),
        initial_supply,
    )?;

    msg!("Ouroboros initialized");

    Ok(())
}
