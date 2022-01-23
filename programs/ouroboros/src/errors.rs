use anchor_lang::error;

#[error]
pub enum ErrorCode {
    #[msg("Incentives need to be claimed first")]
    UnclaimedIncentives,
    #[msg("Given snapshot is invalid")]
    InvalidSnapshot,
}
