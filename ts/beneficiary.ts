import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY
} from "@solana/web3.js";
import { Ouroboros } from ".";

/**
 * A helper class to interact with an instance of a beneficiary
 */
export class Beneficiary {
  ouroboros: Ouroboros;
  account: PublicKey;

  address: PublicKey;;
  bump: number;

  constructor(ouroboros: Ouroboros, account: PublicKey) {
    this.ouroboros = ouroboros;
    this.account = account

    const [beneficiaryAddress, beneficiaryBump] =
    findProgramAddressSync(
        [
          Buffer.from("beneficiary"),
          ouroboros.id.toBuffer("le", 8),
          account.toBuffer(),
        ],
        ouroboros.program.programId
      );

    this.bump = beneficiaryBump;
    this.address = beneficiaryAddress;
  }

  /**
   * Creates a new beneficiary for incentives
   * 
   * @param ouroboros - The parent ouroboros
   * @param account - The beneficiary's account
   * @returns The beneficiary
   */
  static async create(
    ouroboros: Ouroboros,
    account: PublicKey
  ) {
    const beneficiary = new Beneficiary(ouroboros, account);

    await ouroboros.program.rpc.createBeneficiary(beneficiary.bump, account, {
      accounts: {
        ouroboros: ouroboros.addresses.ouroboros,
        beneficiary: beneficiary.address,
        creator: ouroboros.provider.wallet.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      }
    });

    return beneficiary;
  }

  async claimIncentives() {
    await this.ouroboros.program.rpc.claimIncentives({
      accounts: {
        ouroboros: this.ouroboros.addresses.ouroboros,
        authority: this.ouroboros.addresses.authority,
        mint: this.ouroboros.addresses.mint,
        beneficiary: this.address,
        account: this.account,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
    });
  }
}
