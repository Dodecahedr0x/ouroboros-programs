import { Provider, BN, workspace, Program, Idl } from "@project-serum/anchor";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { OuroborosBumps } from "./types";
import { Ouroboros as OuroborosType } from "../target/types/ouroboros";
import OuroborosIdl from "../target/idl/ouroboros.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Locker } from "./locker";
import { Asset, Beneficiary } from ".";

/**
 * A helper class to interact with an instance of Ouroboros
 */
export class Ouroboros {
  provider: Provider;
  program: Program<OuroborosType>;
  id: BN;
  supply: BN;
  period: BN;
  expansionFactor: BN;
  timeMultiplier: BN;
  token: Token;
  addresses: {
    ouroboros: PublicKey;
    authority: PublicKey;
    mint: PublicKey;
  };
  bumps: OuroborosBumps;

  /**
   *
   * @param provider The provider
   * @param id - The unique identifier of the Ouroboros
   * @param period - The period of rewards and snapshot
   * @param expansionFactor - The factor of expansion of the circulating supply
   * @param multiplier - The weekly multiplier of voting power. 10000 = double every week
   */
  constructor(
    provider: Provider,
    id: BN,
    period: BN,
    expansionFactor: BN,
    multiplier: BN
  ) {
    this.provider = provider;
    this.program = new Program<OuroborosType>(
      OuroborosIdl as any,
      OuroborosIdl.metadata.address,
      provider
    );
    this.id = id;
    this.period = period;
    this.timeMultiplier = multiplier;
    this.expansionFactor = expansionFactor;

    const [ouroborosAddress, ouroborosBump] = findProgramAddressSync(
      [Buffer.from("ouroboros"), this.id.toBuffer("le", 8)],
      this.program.programId
    );
    const [authorityAddress, authorityBump] = findProgramAddressSync(
      [Buffer.from("authority"), this.id.toBuffer("le", 8)],
      this.program.programId
    );
    const [mintAddress, mintBump] = findProgramAddressSync(
      [Buffer.from("mint"), this.id.toBuffer("le", 8)],
      this.program.programId
    );

    this.token = new Token(
      provider.connection,
      mintAddress,
      TOKEN_PROGRAM_ID,
      provider.wallet as any
    );

    this.addresses = {
      ouroboros: ouroborosAddress,
      authority: authorityAddress,
      mint: mintAddress,
    };
    this.bumps = {
      ouroboros: ouroborosBump,
      authority: authorityBump,
      mint: mintBump,
    };
  }

  /**
   * Allows switching providers
   * Useful to have one wallet per provider
   * 
   * @param provider - The new provider
   * @returns The program connected to the new provider
   */
  connect(provider: Provider) {
    this.provider = provider
    return this
  }

  /**
   * Initializes an Ouroboros with its native token.
   * The supply is minted to the creator
   *
   * @param creator - The address of the wallet creating the Ouroboros
   * @param supply - The initial supply of the native mint
   * @param start - The date of the first period as a timestamp
   * @returns The Ouroboros
   */
  async initialize(creator: PublicKey, supply: BN, start: BN) {
    const creatorAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.addresses.mint,
      creator
    );

    await this.program.rpc.initializeOuroboros(
      this.bumps,
      this.id,
      supply,
      this.period,
      start,
      this.expansionFactor,
      this.timeMultiplier,
      {
        accounts: {
          ouroboros: this.addresses.ouroboros,
          authority: this.addresses.authority,
          mint: this.addresses.mint,
          creator: creator,
          creatorAccount: creatorAccount,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    return this;
  }

  static async create(
    provider: Provider,
    id: BN,
    period: BN,
    expansionFactor: BN,
    multiplier: BN,
    creator: PublicKey,
    supply: BN,
    start: BN
  ) {
    const ouroboros = new Ouroboros(
      provider,
      id,
      period,
      expansionFactor,
      multiplier
    );
    await ouroboros.initialize(creator, supply, start);
  }

  /**
   *
   * @param provider - Provider with the signer that will sign transactions
   * @param id - The unique identifier of the Ouroboros
   * @returns - The Ouroboros
   */
  static async load(provider: Provider, id: BN) {
    const program = new Program<OuroborosType>(
      OuroborosIdl as any,
      OuroborosIdl.metadata.address,
      provider
    );

    const [ouroborosAddress] = findProgramAddressSync(
      [Buffer.from("ouroboros"), new BN(id).toBuffer("le", 8)],
      program.programId
    );
    const account = await program.account.ouroboros.fetch(ouroborosAddress);

    return new Ouroboros(
      provider,
      id,
      account.period,
      account.expansionFactor,
      account.timeMultiplier
    );
  }

  async createLocker(lockerId: PublicKey, amount: BN, duration: BN) {
    return Locker.create(this, lockerId, amount, duration);
  }

  /**
   * Create a new beneficiary of the protocol
   *
   * @param account - The account that will receive the incentives
   * @returns - The beneficiary
   */
  async createBeneficiary(account: PublicKey) {
    return Beneficiary.create(this, account);
  }

  /**
   * Send tokens to the ouroboros and notifies it
   * @param mint - The mint of the asset
   * @param amount - The amount sent
   * @param options - Specify timestamp
   * @returns 
   */
  async sendAssetAndNotify(
    mint: PublicKey,
    amount: BN,
    options: { timestampIndex?: BN } = {}
  ) {
    const asset = new Asset(this, mint);
    const senderAccount = await asset.token.getOrCreateAssociatedAccountInfo(
      this.provider.wallet.publicKey
    );

    const timestampIndex = options.timestampIndex ? options.timestampIndex : new BN(0)

    const [snapshotAddress, snapshotBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("snapshot"),
        this.id.toBuffer("le", 8),
        mint.toBuffer(),
        timestampIndex.toBuffer("le", 8),
      ],
      this.program.programId
    );

    await this.program.rpc.receiveAsset(
      asset.bumps,
      snapshotBump,
      timestampIndex,
      amount,
      {
        accounts: {
          ouroboros: this.addresses.ouroboros,
          asset: asset.addresses.asset,
          authority: asset.addresses.authority,
          currentSnapshot: snapshotAddress,
          mint: mint,
          ouroborosAccount: asset.addresses.account,
          sender: this.provider.wallet.publicKey,
          senderAccount: senderAccount.address,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    return { asset, snapshot: snapshotAddress };
  }

  /**
   * Returns the asset of the associated mint only if it exists
   * 
   * @param mint - The mint of the asset
   * @returns The fetched asset or nothing
   */
  async getAsset(mint: PublicKey): Promise<Asset> {
    const asset = new Asset(this, mint)
    return await asset.fetch()
  }
}
