use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::state::{Beneficiary, Ouroboros};

#[derive(Accounts)]
pub struct ClaimIncentives<'info> {
    /// The Ouroboros
    #[account(
        mut,
        seeds = [
            b"ouroboros",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.ouroboros,
        has_one = authority,
        has_one = mint
    )]
    pub ouroboros: Box<Account<'info, Ouroboros>>,

    /// The Ouroboros authority
    #[account(mut)]
    pub authority: AccountInfo<'info>,

    /// The mint of the Ouroboros token
    #[account(
        mut,
        seeds = [
            b"mint",
            ouroboros.id.to_le_bytes().as_ref()
        ],
        bump = ouroboros.bumps.mint
    )]
    pub mint: Box<Account<'info, Mint>>,

    /// The beneficiary of the ouroboros incentives
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary.account.as_ref()
        ],
        bump = beneficiary.bump,
        has_one = account,
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    /// The account receiving incentives
    #[account(mut)]
    pub account: Box<Account<'info, TokenAccount>>,

    /// The program for interacting with the token.
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub clock: Sysvar<'info, Clock>,
}

impl<'info> ClaimIncentives<'info> {
    fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.mint.to_account_info(),
                to: self.account.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}

pub fn handler(ctx: Context<ClaimIncentives>) -> ProgramResult {
    let ouroboros = &mut ctx.accounts.ouroboros;
    if ouroboros.last_period + ouroboros.reward_period as i64 > ctx.accounts.clock.unix_timestamp {
        msg!(
            "Ending ouroboros period [{}, {}[",
            ouroboros.last_period,
            ouroboros.last_period + ouroboros.reward_period as i64
        );
        ouroboros.last_period += ouroboros.reward_period as i64;
        ouroboros.last_period_votes = ouroboros.total_votes;
    }

    let beneficiary = &mut ctx.accounts.beneficiary;
    let mut amount: u64 = 0;
    if beneficiary.last_update < ouroboros.last_period {
        beneficiary.last_update = ouroboros.last_period;
        beneficiary.weight = (10000 * beneficiary.votes / ouroboros.last_period_votes) as u16;

        let total_emissions =
            (ctx.accounts.mint.supply - ouroboros.total_votes) * ouroboros.expansion_factor / 10000;
        amount = total_emissions * beneficiary.weight as u64 / 10000;

        let id_seed = ouroboros.id.to_le_bytes();
        let seeds = &[
            b"authority".as_ref(),
            id_seed.as_ref(),
            &[ouroboros.bumps.authority],
        ];
        let signer = &[&seeds[..]];
        token::mint_to(ctx.accounts.transfer_context().with_signer(signer), amount)?;
    }
    msg!(
        "Sent {} incentives to {}",
        amount,
        ctx.accounts.account.key(),
    );

    Ok(())
}
