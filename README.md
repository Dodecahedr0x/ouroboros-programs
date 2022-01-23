# Ouroboros Programs

This work is based on these articles:

- https://andrecronje.medium.com/ve-3-3-curves-initial-distribution-competition-building-a-protocol-for-protocols-79a1ff1cf1a1
- https://andrecronje.medium.com/ve-3-3-ouroboros-part-1-fee-distribution-5dcf131dc82e
- https://andrecronje.medium.com/ve-3-3-ouroboros-part-2-fees-explored-c8e026841ae

## Overview

Ouroboros should be used where you want stakeholders to decide where to allocate token emissions.
Examples are AMM like Uniswap where you want to give native token rewards for liquidity providers or lending platforms where you give incentives to lenders and borrowers.

**This project implements the Ouroboros model for a Uniswap V2 AMM**.
This aims to provide the Solana ecosystem with cheaper to deploy permisionless pools and an decentralized incentive mechanism.

The principle is that native token holders can locker their tokens in a locker for a defined period of time, and they receive voting power depending on the amount they locked and the locking period.
With this voting power, they can vote for any pool to receive some amount of native token as liquidity provider incentives.

This results in the following properties:

- Locked holders earn 100% trading fees of pools they chose to give incentives to, while liquidity provides earns the native token incentives.
- Locked holders earn half of all token emission to prevent dilution.
- Liquidity providers earn 100% of trading fees on unincentivized pools

## Modules

There are several modules composing this program:

- **Pools**: a UniswapV2-like DEX on the Solana blockchain with the stable pools for correlated assets (e.g. USDC/USDT) and standard pools.
- **Ouroboros**: a vote-locking mechanism to incentivize pools.
- **Gauges**: allows distribution of arbitrary tokens to users providing liquidity.

### Pools

- Stable pools and standard pools
- All pools have a 0.1% fee applied, stored outside the liquidity pool, that liquidity providers can claim.

### Ouroboros

- Owners of the ouroboros token can put them in a locker for a defined period of time and acquire voting rights in exchange.
- The voting rights are associated to the locker, which is a tradable NFT.
- Holders can vote for a beneficiary which wil receive an portion of the weekly emissions based on the portion of votes the beneficiary received.
- Total weekly emissions are equal to the circulating supply (tokens outside of lockers) times an expansion factor.

### Gauge

- Pools LP can deposit their token in a gauge to earn trading fees or incentives.
- Gauges bribed by Ouroboros voters give away a fraction of their trading fees accumulated to bribers in exchange for Ouroboros incentives.

## Evolutions

below is a list of **envisionned** changes:

- Auto-compounding vaults. On each interaction, the vault will collect fees and add them back as liquidity. This essentially enables standard UniV2 pools where fees are added as liquidity. Enabling interactions with gauges is important as well.
- Oracles. Adding an oracle account that tracks the price of assets in pools, similar to what UniV2 already does.