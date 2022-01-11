use anchor_lang::error;

#[error]
pub enum ErrorCode {
    #[msg("Custom error")]
    CustomError,
}
