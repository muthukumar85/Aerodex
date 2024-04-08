import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, throwError } from 'rxjs';
import { Metaplex } from '@metaplex-foundation/js';
import {
  AccountMeta,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Currency,
  getPdaTickArrayAddress,
  Liquidity,
  LIQUIDITY_STATE_LAYOUT_V4,
  LiquidityPoolInfo,
  LiquidityPoolKeys,
  LiquidityStateV4,
  MARKET_STATE_LAYOUT_V3,
  MarketStateV3,
  Percent,
  PoolInfoLayout,
  SqrtPriceMath,
  SYSTEM_PROGRAM_ID,
  Token,
  TokenAmount,
  WrappedLayout
} from '@raydium-io/raydium-sdk';
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
  Keypair,
  Connection,
  PublicKey,
  ComputeBudgetProgram,
  KeyedAccountInfo,
  TransactionMessage,
  VersionedTransaction,
  Commitment,
  AccountInfo,
  sendAndConfirmTransaction,
  Transaction, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction,
  GetProgramAccountsFilter
} from '@solana/web3.js';
import { getTokenAccounts, RAYDIUM_LIQUIDITY_PROGRAM_ID_V4, OPENBOOK_PROGRAM_ID, createPoolKeys } from './liquidity';
// import { retrieveEnvVariable } from './utils';
import { getMinimalMarketV3, MinimalMarketLayoutV3 } from './market';
import { MintLayout } from './types';
// import pino from 'pino';
import bs58 from 'bs58';
// import * as fs from 'fs';
// import * as path from 'path';
import BN from 'bn.js';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { LocalService } from '../../local-services/local.service';
// const transport = pino.transport({
//   targets: [
//     // {
//     //   level: 'trace',
//     //   target: 'pino/file',
//     //   options: {
//     //     destination: 'buy.log',
//     //   },
//     // },

//     {
//       level: 'trace',
//       target: 'pino-pretty',
//       options: {},
//     },
//   ],
// });

// export const console = pino(
//   {
//     redact: ['poolKeys'],
//     serializers: {
//       error: pino.stdSerializers.err,
//     },
//     base: undefined,
//   },
//   transport,
// );

const network = 'mainnet-beta';
const RPC_ENDPOINT = environment.RPC_ENDPOINT;
const RPC_WEBSOCKET_ENDPOINT = environment.RPC_WEBSOCKET_ENDPOINT;

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
});

export const metaplex = Metaplex.make(solanaConnection);

export type MinimalTokenAccountData = {
  mint: PublicKey;
  address: PublicKey;
  poolKeys?: LiquidityPoolKeys;
  market?: MinimalMarketLayoutV3;
};

export const subject = new BehaviorSubject({});
export const splAccounts = new BehaviorSubject([{}]);
export const baseAddress = new BehaviorSubject('');
export const isRouteFoundorNot = new BehaviorSubject(true);
export const txnspanel = new BehaviorSubject({});
export const buyselltxns = new BehaviorSubject({});
export const snipetxns = new BehaviorSubject({});
export const solprice = new BehaviorSubject(0.00);
export const snipetokenomics = new BehaviorSubject({});
export const isloading = new BehaviorSubject(true);
export const solbalance = new BehaviorSubject({ "sol": 0.0, "wsol": 0.0 });

let existingLiquidityPools: Set<string> = new Set<string>();
let existingOpenBookMarkets: Set<string> = new Set<string>();
let existingTokenAccounts: Map<string, MinimalTokenAccountData> = new Map<string, MinimalTokenAccountData>();
var alltokenAccounts: any = [];
export let wallet: Keypair;
let quoteToken: Token;
let quoteTokenAssociatedAddress: PublicKey;
let quoteAmount: TokenAmount;
// let commitment: Commitment = 'confirmed'; 
let commitment: Commitment = environment.COMMITMENT_LEVEL as Commitment;

// const CHECK_IF_MINT_IS_RENOUNCED = retrieveEnvVariable('CHECK_IF_MINT_IS_RENOUNCED', console) === 'true';
// const USE_SNIPE_LIST = retrieveEnvVariable('USE_SNIPE_LIST', console) === 'true';
// const SNIPE_LIST_REFRESH_INTERVAL = Number(retrieveEnvVariable('SNIPE_LIST_REFRESH_INTERVAL', console));
// const AUTO_SELL = retrieveEnvVariable('AUTO_SELL', console) === 'true';
// const SELL_DELAY = Number(retrieveEnvVariable('SELL_DELAY', console));
// const MAX_SELL_RETRIES = 60;
@Injectable({
  providedIn: 'root'
})

export class TokenomicsService {
  SOL_PRICE = 0.0;
  readonly CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  readonly RANDOM_STRING_LENGTH = 10;
  randomStrings: string[] = [];
  constructor(private http: HttpClient, private toastr: ToastrService, private local: LocalService) {

  }

  async init(): Promise<void> {
    try {


      // get wallet
      const PRIVATE_KEY = this.local.getData('wallet');
      wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
      // console.info(`Wallet Address: ${wallet.publicKey}`);

      // get quote mint and amount
      const QUOTE_MINT = environment.QUOTE_MINT;
      // const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', console);
      switch (QUOTE_MINT) {
        case 'WSOL': {
          // quoteToken = Token.WSOL;
          quoteToken = Token.WSOL;
          // quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);
          break;
        }
        case 'USDC': {
          quoteToken = new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
            6,
            'USDC',
            'USDC',
          );
          // quoteAmount = new TokenAmount(quoteToken, QUOTE_AMOUNT, false);
          break;
        }
        default: {
          throw new Error(`Unsupported quote mint "${QUOTE_MINT}". Supported values are USDC and WSOL`);
        }
      }

      // check existing wallet for associated token account of quote mint
      const tokenAccounts = await getTokenAccounts(solanaConnection, wallet.publicKey, commitment);
      console.log(tokenAccounts[0].programId.toString())
      let solbalances = await solanaConnection.getBalance(new PublicKey(wallet.publicKey));
      console.log(`Wallet Balance: ${solbalances / LAMPORTS_PER_SOL}`)
      let wsolta = tokenAccounts.find(v => v.accountInfo.mint.toString() == quoteToken.mint.toString());
      let wsolbalance = 0.0;
      console.log(JSON.stringify(wsolta))
      if (wsolta) {
        wsolbalance = wsolta.accountInfo.amount.toNumber();
      }
      solbalance.next({ "sol": solbalances / LAMPORTS_PER_SOL, "wsol": wsolbalance / LAMPORTS_PER_SOL });

      alltokenAccounts = tokenAccounts;
      const filters: GetProgramAccountsFilter[] = [
        {
          dataSize: 165, // size of account (bytes)
        },
        {
          memcmp: {
            offset: 32, // location of our query in the account (bytes)
            bytes: wallet.publicKey.toString(), // our search criteria, a base58 encoded string
          },
        }
      ];
      // const tokenAccounts = await solanaConnection.getParsedProgramAccounts(
      //   TOKEN_PROGRAM_ID, // new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      //   { filters }
      // );
      // console.log(tokenAccounts)
      // const filteredtokenAccounts = tokenAccounts.filter(function (value) {
      //   const val = value.account.data;
      //   //@ts-ignore
      //   return val['parsed']['info']['tokenAmount']['uiAmount'] > 0
      // });
      // splAccounts.next(filteredtokenAccounts);

      // for (const ta of tokenAccounts) {
      //   existingTokenAccounts.set(ta.accountInfo.mint.toString(), <MinimalTokenAccountData> {
      //     mint: ta.accountInfo.mint,
      //     address: ta.pubkey,
      //   });
      // }
      // @ts-ignore
      const tokenAccount = tokenAccounts.find((acc) => acc.accountInfo.mint.toString() === quoteToken.mint.toString())!;
      splAccounts.next(tokenAccounts);
      if (!tokenAccount) {
        this.toastr.warning('wrap sol to start trading', 'WSOL not found')
        isRouteFoundorNot.next(false);
        // throw new Error(`No ${quoteToken.symbol} token account found in wallet: ${wallet.publicKey}`);
      }

      // quoteTokenAssociatedAddress = new PublicKey("So11111111111111111111111111111111111111112");
      // const tokenAccountAddress = getAssociatedTokenAddressSync(new PublicKey('So11111111111111111111111111111111111111112'), wallet.publicKey, true);
      // console.log(tokenAccountAddress);
      //@ts-ignore
      quoteTokenAssociatedAddress = tokenAccount.pubkey;
      // console.log(tokenAccount);
    }
    catch (e) {
      console.log(e)
    }

    // load tokens to snipe

  }
  async wrapsol(amount: number) {
    const randomString = this.generateNewRandomString();
    this.toastr.info('wrap transaction send', 'Waiting for Confirmation')
    buyselltxns.next({
      "type": "Wrap",
      "amount": amount,
      "sol_price": this.SOL_PRICE,
      "status": 'loading',
      "signature": randomString,
      "link": '',
      "symbol": 'WSOL' + '/SOL'
    });
    try {

      const ata = getAssociatedTokenAddressSync(new PublicKey('So11111111111111111111111111111111111111112'), wallet.publicKey);
      const solnative = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);
      console.log(ata.toString(), solnative.toString())
      const latestBlockhash = await solanaConnection.getLatestBlockhash({
        commitment: commitment,
      });
      var platformfee = amount * LAMPORTS_PER_SOL;
      console.log(platformfee);


      const transferInstruction = new TransactionInstruction(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: solnative,
          lamports: platformfee,
        })
      );


      // innerTransaction.instructions[0].keys.push({ pubkey: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'), isSigner: false, isWritable: false })
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 40000 }),
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            ata,
            wallet.publicKey,
            new PublicKey('So11111111111111111111111111111111111111112',
            )),
          transferInstruction
        ],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallet]);
      const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
        maxRetries: 5,
        preflightCommitment: commitment,
      });
      const confirmation = await solanaConnection.confirmTransaction(
        {
          signature,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          blockhash: latestBlockhash.blockhash,
        },
        commitment,
      );
      if (!confirmation.value.err) {
        this.toastr.info('wrap transaction send', 'Waiting for Confirmation')
        buyselltxns.next({
          "type": "Wrap",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'confirmed',
          "signature": randomString,
          "link": '',
          "symbol": 'WSOL' + '/SOL'
        });

        this.toastr.success('Confirmed Wrap txn', 'Transaction Confirmed')
        return { "status": 200, "signature": `https://solscan.io/tx/${signature}?cluster=${network}` };
      } else {
        this.toastr.info('wrap transaction send', 'Waiting for Confirmation')
        buyselltxns.next({
          "type": "Wrap",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'cancelled',
          "signature": randomString,
          "link": '',
          "symbol": 'WSOL' + '/SOL'
        });
        console.debug(confirmation.value.err);
        // console.info({ mint: accountData.baseMint, signature }, `Error confirming buy tx`);
        this.toastr.error('Error confirming wrap tx', 'Transaction Cancelled')
      }
    } catch (e) {
      buyselltxns.next({
        "type": "Wrap",
        "amount": amount,
        "sol_price": this.SOL_PRICE,
        "status": 'cancelled',
        "signature": randomString,
        "link": '',
        "symbol": 'WSOL' + '/SOL'
      });
      this.toastr.error('Error confirming wrap tx', 'Transaction Cancelled')
      console.log(e)
    }




  }
  saveTokenAccount(mint: PublicKey, accountData: MinimalMarketLayoutV3) {

    const ata = getAssociatedTokenAddressSync(mint, wallet.publicKey);

    const tokenAccount = <MinimalTokenAccountData> {
      address: ata,
      mint: mint,
      market: <MinimalMarketLayoutV3> {
        bids: accountData.bids,
        asks: accountData.asks,
        eventQueue: accountData.eventQueue,
      },
    };
    existingTokenAccounts.set(mint.toString(), tokenAccount);
    return tokenAccount;
  }
  // isTokenAvailable(address: string): Observable<any> {
  //   return this.http.get(RUGCHECK_API + address + '/report')
  //     .pipe(map(res => {
  //       return res;
  //     }),
  //       catchError(error => throwError(error))
  //     );
  // }
  async getSolanaPrice() {
    const id = new PublicKey('8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj')

    const accountInfo = await solanaConnection.getAccountInfo(id)

    if (accountInfo === null) throw Error(' get pool info error ')

    const poolData = PoolInfoLayout.decode(accountInfo.data)
    var solprice = parseFloat(SqrtPriceMath.sqrtPriceX64ToPrice(poolData.sqrtPriceX64, poolData.mintDecimalsA, poolData.mintDecimalsB).toFixed(2));
    console.log('current price -> ', solprice)
    this.SOL_PRICE = solprice;
    return solprice;
  }
  async fetchMarketAccounts(connection: Connection, base: PublicKey, quote: PublicKey, commitment: Commitment) {
    const accounts = await connection.getProgramAccounts(
      RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
      {
        commitment,
        filters: [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
              bytes: base.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
              bytes: quote.toBase58(),
            },
          },
        ],
      }
    );

    return accounts.map(({ pubkey, account }) => ({
      id: pubkey,
      poolstate: {
        ...LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
      }
    }));
  }

  async buy(accountId: PublicKey, accountData: any, tokenAccounts: any, market: any, tokenAmount: TokenAmount, amount: number, symbol: string, calculatedPrice: number, poolKeys: any): Promise<any> {
    // const raw = quoteAmount.raw.toNumber();
    var tokenAccount = alltokenAccounts.find((v: any) => v.accountInfo.mint.toString() == accountData.quoteMint.toString())
    console.log('tokenAccount->', JSON.stringify(tokenAccounts), JSON.stringify(poolKeys))
    const balanceResponse = tokenAccount.accountInfo.amount.div(new BN(10).pow(accountData.baseDecimal)).toNumber();
    console.log('balance ->', balanceResponse);
    quoteAmount = tokenAmount;

    const solnative = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);
    if (quoteAmount.raw.toNumber() > tokenAccount.accountInfo.amount.toNumber()) {
      this.toastr.warning('wallet balance is too low', 'Wallet Balance Low');
    }
    else {
      // console.log(raw, raw * (0.5 / 100));
      const randomString = this.generateNewRandomString();
      try {
        // console.log(accountData.lpReserve.div(new BN(10).pow(accountData.baseDecimal)).toNumber());
        // console.log((await Liquidity.fetchInfo({ connection: solanaConnection, poolKeys: tokenAccount.poolKeys })).lpSupply.toNumber())
        buyselltxns.next({
          "type": "Buy",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'loading',
          "signature": randomString,
          "link": '',
          "symbol": symbol + '/SOL'
        });

        this.toastr.info('waiting for confirmation', 'Transaction Sent')
        const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
          {
            poolKeys: poolKeys,
            userKeys: {
              tokenAccountIn: solnative,
              tokenAccountOut: tokenAccounts.address,
              owner: wallet.publicKey,
            },
            amountIn: quoteAmount.raw,
            minAmountOut: new BN(0),
          },
          poolKeys.version,
        );

        const latestBlockhash = await solanaConnection.getLatestBlockhash({
          commitment: commitment,
        });
        var platformfee = quoteAmount.raw.toNumber() * (0.5 / 100);
        console.log(platformfee);


        const transferInstruction = new TransactionInstruction(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new PublicKey('7uo9zTb5AC1qkjw7rpi4Hkd9uBQGni1di8ABJnQvqw1m'),
            lamports: platformfee,
          })
        );


        // innerTransaction.instructions[0].keys.push({ pubkey: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'), isSigner: false, isWritable: false })
        const messageV0 = new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              tokenAccounts.address,
              wallet.publicKey,
              accountData.baseMint,
            ),
            ...innerTransaction.instructions,
            transferInstruction
          ],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([wallet, ...innerTransaction.signers]);
        const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
          maxRetries: 20,
          preflightCommitment: commitment,
        });
        const link = `https://solscan.io/tx/${signature}?cluster=${network}`;
        console.info(
          {
            mint: accountData.baseMint,
            url: `https://solscan.io/tx/${signature}?cluster=${network}`,
          },
          'buy',
        );
        const confirmation = await solanaConnection.confirmTransaction(
          {
            signature,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            blockhash: latestBlockhash.blockhash,
          },
          commitment,
        );
        if (!confirmation.value.err) {
          console.info(
            {
              mint: accountData.baseMint,
              signature,
              url: `https://solscan.io/tx/${signature}?cluster=${network}`,
            },
            `Confirmed buy tx`,
          );
          buyselltxns.next({
            "type": "Buy",
            "amount": amount,
            "sol_price": this.SOL_PRICE,
            "status": 'confirmed',
            "signature": randomString,
            "link": link,
            "symbol": symbol + '/SOL'
          });
          this.init()
          this.toastr.success('Confirmed buy txn', 'Transaction Confirmed')
          // return { "status": 200, "signature": `https://solscan.io/tx/${signature}?cluster=${network}` };
        } else {
          buyselltxns.next({
            "type": "Buy",
            "amount": amount,
            "sol_price": this.SOL_PRICE,
            "status": 'cancelled',
            "signature": randomString,
            "link": link,
            "symbol": symbol + '/SOL'
          });
          console.debug(confirmation.value.err);
          console.info({ mint: accountData.baseMint, signature }, `Error confirming buy tx`);
          this.toastr.error('Error confirming buy tx', 'Transaction Cancelled')
        }
      } catch (e) {
        console.debug(e);
        console.error({ mint: accountData.baseMint }, `Failed to buy token`);
        console.error(e, "reer")
        buyselltxns.next({
          "type": "Buy",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'cancelled',
          "signature": randomString,
          "link": 'https://solscan.io/',
          "symbol": symbol + '/SOL'
        });

        this.toastr.error('Failed to Buy Token', 'Transaction Failed')
      }
    }
  }

  async sell(accountData: LiquidityStateV4, poolKeys: any, symbol: string, percentage: number, TOKEN_PRICE_IN_SOL: any,): Promise<void> {
    const solnative = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);
    var tokenAccount = alltokenAccounts.find((v: any) => v.accountInfo.mint.toString() == accountData.baseMint.toString())
    console.log('tokenAccount->', tokenAccount)
    const balanceResponse = tokenAccount.accountInfo.amount.div(new BN(10).pow(accountData.baseDecimal)).toNumber();
    // const balanceResponse = tokenAccount.accountInfo.amount.mul(new BN(percentage).div(new BN(100)));
    console.log('balance ->', balanceResponse, percentage);
    const amount = balanceResponse * (percentage / 100)
    if (tokenAccount == null || tokenAccount == undefined) {
      this.toastr.warning('No Token in Your Wallet', 'Token Not Available')
    } else {
      let balanceFound = false;
      const randomString = this.generateNewRandomString();
      try {
        this.toastr.info('waiting for confirmation', 'Transaction Sent');
        buyselltxns.next({
          "type": "Sell",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'loading',
          "signature": randomString,
          "link": '',
          "symbol": symbol + '/SOL'
        });
        // const rawamount = amount * (10 ** accountData.baseDecimal.toNumber())
        const token = new Token(TOKEN_PROGRAM_ID, accountData.baseMint, accountData.baseDecimal.toNumber());
        const rawamount = new TokenAmount(token, new BN(amount))
        const per = percentage / 100;
        const rawamountdraft = tokenAccount.accountInfo.amount.div(new BN(100)).mul(new BN(percentage));
        console.log('amount ->', amount, rawamount.raw, rawamountdraft.toNumber());

        if (balanceResponse !== null && Number(balanceResponse) > 0 && !balanceFound) {
          balanceFound = true;
          const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
            {
              poolKeys: poolKeys!,
              userKeys: {
                tokenAccountIn: tokenAccount.pubkey,
                tokenAccountOut: solnative,
                owner: wallet.publicKey,
              },
              amountIn: rawamountdraft,
              minAmountOut: new BN(0),
            },
            poolKeys!.version,
          );
          var platformfee = amount * TOKEN_PRICE_IN_SOL * LAMPORTS_PER_SOL * (0.5 / 100);
          console.log(platformfee);
          const transferInstruction = new TransactionInstruction(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: new PublicKey('7uo9zTb5AC1qkjw7rpi4Hkd9uBQGni1di8ABJnQvqw1m'),
              lamports: Number(platformfee.toFixed(0)),
            })
          );
          const latestBlockhash = await solanaConnection.getLatestBlockhash({
            commitment: commitment,
          });
          const messageV0 = new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [
              ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20000 }),
              ...innerTransaction.instructions,
              transferInstruction,
              // createCloseAccountInstruction(tokenAccount.pubkey, wallet.publicKey, wallet.publicKey),
            ],
          }).compileToV0Message();
          const transaction = new VersionedTransaction(messageV0);
          transaction.sign([wallet, ...innerTransaction.signers]);

          const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
            maxRetries: 5,
            preflightCommitment: commitment,
          });
          const link = `https://solscan.io/tx/${signature}?cluster=${network}`;
          console.info(
            {
              mint: accountData.baseMint,
              url: `https://solscan.io/tx/${signature}?cluster=${network}`,
            },
            'sell',
          );
          const confirmation = await solanaConnection.confirmTransaction(
            {
              signature,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
              blockhash: latestBlockhash.blockhash,
            },
            commitment,
          );

          if (!confirmation.value.err) {
            console.info(
              {
                mint: accountData.baseMint,
                signature,
                url: `https://solscan.io/tx/${signature}?cluster=${network}`,
              },
              `Confirmed buy tx`,
            );
            buyselltxns.next({
              "type": "Sell",
              "amount": amount,
              "sol_price": this.SOL_PRICE,
              "status": 'confirmed',
              "signature": randomString,
              "link": link,
              "symbol": symbol + '/SOL'
            });

            this.toastr.success('Confirmed sell txn', 'Transaction Confirmed')
            this.init()
          } else {
            buyselltxns.next({
              "type": "Sell",
              "amount": amount,
              "sol_price": this.SOL_PRICE,
              "status": 'cancelled',
              "signature": randomString,
              "link": link,
              "symbol": symbol + '/SOL'
            });
            this.toastr.error('Error confirming sell tx', 'Transaction Cancelled')
            console.debug(confirmation.value.err);
            console.info({ mint: accountData.baseMint, signature }, `Error confirming buy tx`);
          }
        } else {
          this.toastr.warning('Token Balance is Zero', 'Balance Zero')
          buyselltxns.next({
            "type": "Sell",
            "amount": amount,
            "sol_price": this.SOL_PRICE,
            "status": 'cancelled',
            "signature": randomString,
            "link": '',
            "symbol": symbol + '/SOL'
          });
        }
      } catch (error) {
        // ignored
        console.log(error);
        buyselltxns.next({
          "type": "Sell",
          "amount": amount,
          "sol_price": this.SOL_PRICE,
          "status": 'cancelled',
          "signature": randomString,
          "link": '',
          "symbol": symbol + '/SOL'
        });
        this.toastr.error('Failed to Sell Token', 'Transaction Failed')
      }
    }
  }

  async snipe(baseToken: PublicKey, symbol: string, quoteAmountRaw: TokenAmount) {
    const runTimestamp = Math.floor(new Date().getTime() / 1000);
    const randomString = this.generateNewRandomString()
    try {
      snipetxns.next({
        "type": "Snipe",
        "amount": quoteAmountRaw.toExact(),
        "sol_price": this.SOL_PRICE,
        "status": 'loading',
        "signature": randomString,
        "link": 'https://solscan.io',
        "symbol": symbol + '/SOL'
      });

      const raydiumSubscriptionId = solanaConnection.onProgramAccountChange(
        RAYDIUM_LIQUIDITY_PROGRAM_ID_V4,
        async (updatedAccountInfo) => {
          const key = updatedAccountInfo.accountId.toString();
          const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
          const poolOpenTime = parseInt(poolState.poolOpenTime.toString());
          const existing = existingLiquidityPools.has(key);
          // console.log(updatedAccountInfo);
          if (poolOpenTime > runTimestamp && !existing) {
            existingLiquidityPools.add(key);
            const _ = this.sniperBuy(updatedAccountInfo.accountId, poolState, symbol, quoteAmountRaw, randomString);

          }
        },
        commitment,
        [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
              bytes: baseToken.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
              bytes: OPENBOOK_PROGRAM_ID.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('status'),
              bytes: bs58.encode([6, 0, 0, 0, 0, 0, 0, 0]),
            },
          },
        ],
      );

      const openBookSubscriptionId = solanaConnection.onProgramAccountChange(
        OPENBOOK_PROGRAM_ID,
        async (updatedAccountInfo) => {
          const key = updatedAccountInfo.accountId.toString();
          const existing = existingOpenBookMarkets.has(key);
          if (!existing) {
            existingOpenBookMarkets.add(key);
            const _ = this.processOpenBookMarket(updatedAccountInfo);
          }
        },
        commitment,
        [
          { dataSize: MARKET_STATE_LAYOUT_V3.span },
          {
            memcmp: {
              offset: MARKET_STATE_LAYOUT_V3.offsetOf('baseMint'),
              bytes: baseToken.toBase58(),
            },

          },
        ],
      );
      console.log(raydiumSubscriptionId, openBookSubscriptionId);
    } catch (e) {

    }
  }

  async sniperBuy(accountId: PublicKey, accountData: LiquidityStateV4, symbol: string, quoteAmountRaw: TokenAmount, randomString: string) {
    var tokenAccounts = alltokenAccounts.find((v: any) => v.accountInfo.mint.toString() == accountData.quoteMint.toString())
    console.log('tokenAccount->', tokenAccounts)
    const balanceResponse = tokenAccounts.accountInfo.amount.div(new BN(10).pow(accountData.baseDecimal)).toNumber();
    console.log('balance ->', balanceResponse);
    console.log(quoteAmountRaw.raw.toNumber());
    if (quoteAmountRaw.raw > tokenAccounts.accountInfo.amount.toNumber()) {
      this.toastr.warning('wallet balance is too low', 'Wallet Balance Low');
    }
    else {

      try {
        let tokenAccount = existingTokenAccounts.get(accountData.baseMint.toString());

        if (!tokenAccount) {
          // it's possible that we didn't have time to fetch open book data
          const market = await getMinimalMarketV3(solanaConnection, accountData.marketId, commitment);
          tokenAccount = this.saveTokenAccount(accountData.baseMint, market);
        }
        this.toastr.info('transaction send successfully', 'Waiting for Confirmation');

        tokenAccount.poolKeys = createPoolKeys(accountId, accountData, tokenAccount.market!);
        const { innerTransaction, address } = Liquidity.makeSwapFixedInInstruction(
          {
            poolKeys: tokenAccount.poolKeys,
            userKeys: {
              tokenAccountIn: quoteTokenAssociatedAddress,
              tokenAccountOut: tokenAccount.address,
              owner: wallet.publicKey,
            },
            amountIn: quoteAmountRaw.raw,
            minAmountOut: 0,
          },
          tokenAccount.poolKeys.version,
        );

        const latestBlockhash = await solanaConnection.getLatestBlockhash({
          commitment: commitment,
        });
        const messageV0 = new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 30000 }),
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              tokenAccount.address,
              wallet.publicKey,
              accountData.baseMint,
            ),
            ...innerTransaction.instructions,
          ],
        }).compileToV0Message();
        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([wallet, ...innerTransaction.signers]);
        const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
          maxRetries: 20,
          preflightCommitment: commitment,
        });
        console.info(
          {
            mint: accountData.baseMint,
            url: `https://solscan.io/tx/${signature}?cluster=${network}`,
            dexURL: `https://dexscreener.com/solana/${accountData.baseMint}?maker=${wallet.publicKey}`,
          },
          'Sniper Buy',
        );
        const link = `https://solscan.io/tx/${signature}?cluster=${network}`;
        const confirmation = await solanaConnection.confirmTransaction(
          {
            signature,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            blockhash: latestBlockhash.blockhash,
          },
          commitment,
        );
        if (!confirmation.value.err) {
          console.info(
            {
              mint: accountData.baseMint,
              signature,
              url: `https://solscan.io/tx/${signature}?cluster=${network}`,
            },
            `Confirmed buy tx`,
          );
          snipetxns.next({
            "type": "Snipe",
            "amount": quoteAmountRaw.toExact(),
            "sol_price": this.SOL_PRICE,
            "status": 'confirmed',
            "signature": randomString,
            "link": link,
            "symbol": symbol + '/SOL'
          });
          this.toastr.success('Confirmed buy txn', 'Transaction Confirmed')
          return { "status": 200, "signature": `https://solscan.io/tx/${signature}?cluster=${network}` };
        } else {
          snipetxns.next({
            "type": "Snipe",
            "amount": quoteAmountRaw.toExact(),
            "sol_price": this.SOL_PRICE,
            "status": 'cancelled',
            "signature": randomString,
            "link": 'https://solscan.io/',
            "symbol": symbol + '/SOL'
          });
          console.debug(confirmation.value.err);
          console.info({ mint: accountData.baseMint, signature }, `Error confirming buy tx`);
          this.toastr.error('Error confirming buy tx', 'Transaction Cancelled')
        }
      } catch (e) {
        console.debug(e);
        console.error({ mint: accountData.baseMint }, `Failed to buy token`);
        console.error(e, "reer")
        snipetxns.next({
          "type": "Snipe",
          "amount": quoteAmountRaw.toExact(),
          "sol_price": this.SOL_PRICE,
          "status": 'cancelled',
          "signature": randomString,
          "link": 'https://solscan.io/',
          "symbol": symbol + '/SOL'
        });

        this.toastr.error('Failed to Snipe Token', 'Transaction Failed')
      }
    }

  }


  generateNewRandomString(): string {
    let newRandomString = '';
    do {
      newRandomString = '';
      for (let i = 0; i < this.RANDOM_STRING_LENGTH; i++) {
        newRandomString += this.CHARS[Math.floor(Math.random() * this.CHARS.length)];
      }
    } while (this.randomStrings.includes(newRandomString));
    this.randomStrings.push(newRandomString);
    return newRandomString;
  }

  async FetchTokenMetadata(MintAddress: string) {

    var tokenAddress = new PublicKey(MintAddress);
    return metaplex.nfts().findByMint({ mintAddress: tokenAddress });
    // return tokenData;

  }

  async processOpenBookMarket(
    updatedAccountInfo: KeyedAccountInfo,
  ) {
    let accountData: MarketStateV3 | undefined;
    try {
      accountData = MARKET_STATE_LAYOUT_V3.decode(updatedAccountInfo.accountInfo.data);

      // to be competitive, we collect market data before buying the token...
      if (existingTokenAccounts.has(accountData.baseMint.toString())) {
        return;
      }

      this.saveTokenAccount(accountData.baseMint, accountData);
    } catch (e) {
      console.error({ ...accountData, error: e }, `Failed to process market`);
    }
  }


}
