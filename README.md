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

__Pools can only be used with 9 decimals token!__

## Accounts

This section describes the different accounts used by the programs

### Ouroboros

An Ouroboros is the core of the governance and token emissions. It is the owner of the native token and controls most paremeters:

- Weekly token emissions
- Token vesting range for the lockers
- Initial supply

### Lockers

Holders of the native token can stake their tokens in lockers for a period of time. Holders can open multiple lockers with different vesting periods.
