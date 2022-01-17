use anchor_lang::error;

#[error]
pub enum ErrorCode {
    #[msg("Insufficient amount")]
    InsufficientAmount,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Insufficient liquidity minted")]
    InsufficientLiquidityMinted,
    #[msg("Insufficient input")]
    InsufficientInput,
    #[msg("Insufficient output")]
    InsufficientOutput,
    #[msg("Violated invariant K")]
    InvariantK,
}
