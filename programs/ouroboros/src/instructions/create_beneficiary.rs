use anchor_lang::prelude::*;

use crate::state::{Beneficiary, Ouroboros};

#[derive(Accounts)]
#[instruction(bump: u8, account: Pubkey)]
pub struct CreateBeneficiary<'info> {
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
        init,
        seeds = [
            b"beneficiary",
            account.as_ref()
        ],
        bump = bump,
        payer = creator
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    /// The wallet creating the beneficiary
    #[account(mut)]
    pub creator: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateBeneficiary>, bump: u8, account: Pubkey) -> ProgramResult {
    let beneficiary = &mut ctx.accounts.beneficiary;
    beneficiary.account = account;
    beneficiary.last_update = ctx.accounts.ouroboros.last_period;
    beneficiary.bump = bump;

    msg!("Beneficiary created");

    Ok(())
}
