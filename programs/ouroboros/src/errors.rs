use anchor_lang::error;

#[error]
pub enum ErrorCode {
    #[msg("Incentives need to be claimed first")]
    UnclaimedIncentives,
}
