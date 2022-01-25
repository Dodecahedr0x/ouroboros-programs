import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { PublicKey } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AssetAccount, AssetBumps, Ouroboros } from ".";

/**
 * A helper class to interact with an instance of an asset
 */
export class Asset {
  asset?: AssetAccount;
  ouroboros: Ouroboros;
  mint: PublicKey;
  token: Token;
  addresses: {
    asset: PublicKey;
    authority: PublicKey;
    account: PublicKey;
  };
  bumps: AssetBumps;

  constructor(ouroboros: Ouroboros, mint: PublicKey) {
    this.ouroboros = ouroboros;
    this.mint = mint;

    const [assetAddress, assetBump] = findProgramAddressSync(
      [Buffer.from("asset"), ouroboros.id.toBuffer("le", 8), mint.toBuffer()],
      ouroboros.program.programId
    );
    const [assetAuthorityAddress, assetAuthorityBump] = findProgramAddressSync(
      [
        Buffer.from("asset_authority"),
        ouroboros.id.toBuffer("le", 8),
        mint.toBuffer(),
      ],
      ouroboros.program.programId
    );
    const [accountAddress, accountBump] = findProgramAddressSync(
      [
        Buffer.from("asset_account"),
        ouroboros.id.toBuffer("le", 8),
        mint.toBuffer(),
      ],
      ouroboros.program.programId
    );

    this.addresses = {
      asset: assetAddress,
      authority: assetAuthorityAddress,
      account: accountAddress,
    };
    this.bumps = {
      asset: assetBump,
      authority: assetAuthorityBump,
      account: accountBump,
    };

    this.token = new Token(
      ouroboros.provider.connection,
      mint,
      TOKEN_PROGRAM_ID,
      ouroboros.provider.wallet as any
    );
  }

  async fetch(): Promise<Asset> {
    try {
      const {
        mint,
        authority,
        rewardHeight,
        lastUpdate,
        lastSnapshotIndex,
        bumps,
      } = await this.ouroboros.program.account.asset.fetch(
        this.addresses.asset
      );
      this.asset = {
        mint,
        authority,
        rewardHeight,
        lastUpdate,
        lastSnapshotIndex,
        bumps: (bumps as AssetBumps)
      };
      return this;
    } catch (err) {}
  }
}
