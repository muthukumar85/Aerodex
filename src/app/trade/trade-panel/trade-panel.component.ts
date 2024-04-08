import { Component, ElementRef, QueryList, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs'
import { MinimalTokenAccountData, TokenomicsService, baseAddress, isRouteFoundorNot, isloading, snipetokenomics, solanaConnection, subject, txnspanel, wallet } from '../services/tokenomics.service';
import { ToastrService } from 'ngx-toastr';
import { Liquidity, LiquidityPoolInfo, Percent, SqrtPriceMath, TOKEN_PROGRAM_ID, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { Metaplex, PublicKey, TokenClient } from '@metaplex-foundation/js';
import { environment } from '../../../environments/environment';
import { Commitment, ConfirmedSignatureInfo, SignaturesForAddressOptions, TransactionSignature } from '@solana/web3.js';
import { getMinimalMarketV3 } from '../services/market';
import { createPoolKeys } from '../services/liquidity';
import BN from 'bn.js';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-trade-panel',
  templateUrl: './trade-panel.component.html',
  styleUrls: ['./trade-panel.component.css']
})
export class TradePanelComponent {
  @ViewChild('buypanel') Buy!: ElementRef;
  @ViewChild('sellpanel') Sell!: ElementRef;
  @ViewChild('snipepanel') Snipe!: ElementRef;
  @ViewChild('buybutton') BuyButton!: ElementRef;
  @ViewChild('sellbutton') SellButton!: ElementRef;
  @ViewChild('snipebutton') SnipeButton!: ElementRef;
  @ViewChild('tokenaddress') inputRef!: ElementRef;
  @ViewChild('spinner') spinner!: ElementRef;
  @ViewChild('toast') toast!: ElementRef;
  loader: boolean = false;
  tokenmetadata: any = {};
  tokenAccount: any;
  poolInfo: LiquidityPoolInfo;
  market: any;
  tokenAddress: string;
  AMMPoolInfo: any;
  AMMPoolID: any;
  commitment: Commitment = environment.COMMITMENT_LEVEL as Commitment;
  TOKEN_PRICE: any;
  PRICE_IMPACT: any = 'Loading...';
  disableBuyOption: boolean = false;
  disableSnipeOption: boolean = true;
  isRouteFound: boolean = true;
  SOL_PRICE: any = 0.00;
  CALCULATED_USD_PRICE: any = 0.00;
  SNIPE_CALCULATED_USD_PRICE: any = 0.00;
  RawPoolState: any;
  imageURL = '';
  enteredPrice: number = 0.0;
  enteredPercentage: number;
  enteredSnipePrice: number;
  PoolKeys: any;

  constructor(private tokenservice: TokenomicsService, private toastr: ToastrService, private router: Router, private activatedRoute: ActivatedRoute) {
    environment.AUTO_SELL = false;

  }
  ngOnInit(): void {

  }

  buyclick() {
    this.Snipe.nativeElement.style.display = 'none'
    this.Sell.nativeElement.style.display = 'none'
    this.Buy.nativeElement.style.display = 'block'
    this.BuyButton.nativeElement.style.borderColor = 'var(--aero-colors-whatsapp-400)'
    this.SellButton.nativeElement.style.borderColor = 'transparent'
    this.SnipeButton.nativeElement.style.borderColor = 'transparent'
  }

  sellclick() {
    this.Snipe.nativeElement.style.display = 'none'
    this.Sell.nativeElement.style.display = 'block'
    this.Buy.nativeElement.style.display = 'none'
    this.BuyButton.nativeElement.style.borderColor = 'transparent'
    this.SellButton.nativeElement.style.borderColor = 'var(--aero-colors-red-400)'
    this.SnipeButton.nativeElement.style.borderColor = 'transparent'
  }

  snipeclick() {
    this.Snipe.nativeElement.style.display = 'block'
    this.Sell.nativeElement.style.display = 'none'
    this.Buy.nativeElement.style.display = 'none'
    this.BuyButton.nativeElement.style.borderColor = 'transparent'
    this.SellButton.nativeElement.style.borderColor = 'transparent'
    this.SnipeButton.nativeElement.style.borderColor = 'var(--tg-common-color-violet)'
  }

  launch_toast() {
    this.toast.nativeElement.className = "show";
    setTimeout(() => { this.toast.nativeElement.className = this.toast.nativeElement.className.replace("show", ""); }, 5000);
  }

  async ngAfterViewInit(): Promise<void> {
    this.buyclick();
    isRouteFoundorNot.subscribe((v) => {
      this.isRouteFound = v;
      // this.disableBuyOption = true;
    })
    this.spinner.nativeElement.style.display = 'inline';
    var [token, sol_p] = await Promise.all([
      this.tokenservice.init(),
      this.tokenservice.getSolanaPrice(),
      this.getPnl(),
    ])
    this.SOL_PRICE = sol_p;
    this.activatedRoute.queryParams.subscribe(async params => {
      this.tokenAddress = params['token'];

      if (!this.tokenAddress) {
        this.toastr.error('', 'Invalid Link')
        const currentUrl = '/trade';
        const queryParams = { token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' };
        this.router.navigate([currentUrl], { queryParams: queryParams });
      } else {
        this.onTokenLaunch(this.tokenAddress.toString())
      }
    });

  }
  async wrapsolana(amount: string) {
    this.tokenservice.wrapsol(Number(amount)).then((v) => {
      if (v?.status == 200) {
        this.tokenservice.init();
      }
    })
      .catch((e) => {

      });
  }
  async onTokenSearch() {
    this.spinner.nativeElement.style.display = 'inline';
    isloading.next(true);
    this.tokenAddress = this.inputRef.nativeElement.value;
    // console.log(await formatAmmKeysToApi(tokenaddress));
    try {
      var res = await Promise.all([
        this.tokenservice.FetchTokenMetadata(this.tokenAddress).then(async (response: any) => {
          if (response && response.model == "sft") {
            this.tokenmetadata = response;
            console.log(response.uri)
            this.imageURL = response.json.image;
            // this.toastr.success(response, 'Token Found');
            console.log(JSON.parse(JSON.stringify(response)));

          } else {
            this.toastr.error('Invalid Token Address', 'Check your input address');
            this.spinner.nativeElement.style.display = 'none';
          }
        }, error => {
          this.spinner.nativeElement.style.display = 'none';
          console.log(error);
          this.toastr.error(error, 'Check your input address');
        })
      ])
      await this.getRaydiumPoolData(),
        await this.calculateTokenPrices(),
        this.spinner.nativeElement.style.display = 'none',
        subject.next({
          "tokenmeta": this.tokenmetadata,
          "pooldata": this.RawPoolState,
          "sol_price": this.SOL_PRICE,
          "token_price": this.TOKEN_PRICE
        }),
        txnspanel.next({
          "tokenmeta": this.tokenmetadata,
          "pooldata": this.RawPoolState,
          "sol_price": this.SOL_PRICE,
          "token_price": this.TOKEN_PRICE
        })

    }
    catch (error) {
      this.spinner.nativeElement.style.display = 'none';
      console.log(error);
      this.toastr.error('', 'Check your input address');
    }
  }
  async onTokenLaunch(tokenAdd: string) {
    this.spinner.nativeElement.style.display = 'inline';
    this.tokenAddress = tokenAdd;
    // console.log(await formatAmmKeysToApi(tokenaddress));
    try {
      var res = await Promise.all([
        this.tokenservice.FetchTokenMetadata(this.tokenAddress).then(async (response: any) => {
          if (response && response.model == "sft") {
            this.tokenmetadata = response;
            this.imageURL = response.json.image;
            // this.toastr.success(response, 'Token Found');
            console.log(JSON.parse(JSON.stringify(response)));

          } else {
            this.toastr.error('Invalid Token Address', 'Check your input address');
            this.spinner.nativeElement.style.display = 'none';
          }
        }, error => {
          this.spinner.nativeElement.style.display = 'none';
          console.log(error);
          this.toastr.error(error, 'Check your input address');
        }),

        await this.getRaydiumPoolData(),
        await this.calculateTokenPrices(),
        this.spinner.nativeElement.style.display = 'none',
        subject.next({
          "tokenmeta": this.tokenmetadata,
          "pooldata": this.RawPoolState,
          "sol_price": this.SOL_PRICE,
          "token_price": this.TOKEN_PRICE
        }),
        txnspanel.next({
          "tokenmeta": this.tokenmetadata,
          "pooldata": this.RawPoolState,
          "sol_price": this.SOL_PRICE,
          "token_price": this.TOKEN_PRICE
        })
      ])

    }
    catch (error) {
      this.spinner.nativeElement.style.display = 'none';
      console.log(error);
      this.toastr.error('', 'Check your input address');
    }
  }

  async buy(amount: any) {
    try {
      // this.launch_toast();

      this.tokenservice.buy(
        this.AMMPoolID,
        this.AMMPoolInfo,
        this.tokenAccount,
        this.market,
        new TokenAmount(Token.WSOL, amount, false),
        Number(amount),
        this.tokenmetadata.symbol,
        this.CALCULATED_USD_PRICE,
        this.PoolKeys)
        .then((response) => {
          if (response) {
            this.toastr.success('Token bought successfully', 'Buying Successful')
          } else {
            this.toastr.error('Error Buying Token', 'Buy Error')
          }
        })
    } catch (e) {
      console.log(e);
      this.toastr.error('Error Buying Token', 'Buy Error')
    }
  }

  async sell(percentage: any) {
    try {

      console.log('token_price', this.TOKEN_PRICE);
      this.tokenservice.sell(this.AMMPoolInfo, this.PoolKeys, this.tokenmetadata.symbol, percentage, Number(this.TOKEN_PRICE))
        .then((response) => {
          // if (response) {
          //   this.toastr.success('Token bought successfully', 'Buying Successful')
          // } else {
          //   this.toastr.error('Error Buying Token', 'Buy Error')
          // }
        });
    } catch (e) {
      console.log(e);
      this.toastr.error('Error Selling Token', 'Sell Error')
    }
  }

  async snipe(amount: any) {
    try {

      this.tokenservice.snipe(this.AMMPoolInfo.baseMint, this.tokenmetadata.symbol, new TokenAmount(Token.WSOL, amount, false))
        .then((response) => {
          // if (response) {
          //   this.toastr.success('Token bought successfully', 'Buying Successful')
          // } else {
          //   this.toastr.error('Error Buying Token', 'Buy Error')
          // }
        });
    } catch (e) {
      console.log(e);
      this.toastr.error('Error Selling Token', 'Sell Error')
    }
  }

  async getRaydiumPoolData() {
    try {
      const poolData = await this.tokenservice.fetchMarketAccounts(solanaConnection, new PublicKey(this.tokenAddress), new PublicKey('So11111111111111111111111111111111111111112'), this.commitment);
      const poolDatasell = await this.tokenservice.fetchMarketAccounts(solanaConnection, new PublicKey('So11111111111111111111111111111111111111112'), new PublicKey(this.tokenAddress), this.commitment);
      console.log(JSON.parse(JSON.stringify(poolData)));
      console.log('sell', JSON.parse(JSON.stringify(poolDatasell)))

      if (poolData.length != 0) {
        const runTimestamp = Math.floor(new Date().getTime() / 1000);
        const poolOpenTime = parseInt(poolData[0].poolstate.poolOpenTime.toNumber().toString());
        console.log('pool time->', poolOpenTime, runTimestamp);
        const millisecondsSinceEpoch = poolData[0].poolstate.poolOpenTime.toNumber();
        const date = new Date(millisecondsSinceEpoch).toLocaleString();
        console.log('date->', date);
        if (poolOpenTime > runTimestamp) {
          this.disableBuyOption = true;
          this.disableSnipeOption = false;

          this.snipeclick();

          snipetokenomics.next(this.tokenmetadata);

        } else {
          this.RawPoolState = poolData;
          baseAddress.next(poolData[0].id.toString());
          this.isRouteFound = true;
          this.disableBuyOption = false;
          this.AMMPoolID = poolData[0].id;
          this.AMMPoolInfo = poolData[0].poolstate;
          this.market = await getMinimalMarketV3(solanaConnection, this.AMMPoolInfo.marketId, this.commitment);
          this.tokenAccount = this.tokenservice.saveTokenAccount(this.AMMPoolInfo.baseMint, this.market);
          this.tokenAccount.poolKeys = createPoolKeys(this.AMMPoolID, this.AMMPoolInfo, this.tokenAccount.market!);
          this.PoolKeys = createPoolKeys(this.AMMPoolID, this.AMMPoolInfo, this.tokenAccount.market!);
        }
      }
      else {
        if (poolDatasell.length != 0) {
          baseAddress.next(poolDatasell[0].id.toString());
        }
        this.toastr.warning('', 'Buy Route Not Found');
        this.isRouteFound = false;
        this.disableBuyOption = true;
      }
    } catch (e) {
      console.log(e);
    }
  }
  async calculateTokenPrices() {

    const poolInfo = await Liquidity.fetchInfo({ connection: solanaConnection, poolKeys: this.tokenAccount.poolKeys! });
    const computeamount = Liquidity.computeAmountOut({
      poolKeys: this.tokenAccount.poolKeys!,
      poolInfo: poolInfo,
      amountIn: new TokenAmount(Token.WSOL, 1, false),
      currencyOut: new Token(TOKEN_PROGRAM_ID, this.tokenAccount.mint, this.tokenAccount.poolKeys!.baseDecimals),
      slippage: new Percent(50, 10000),
    })
    var TOKENS_PER_SOL = parseFloat(computeamount.currentPrice.numerator.toString()) / parseFloat(computeamount.currentPrice.denominator.toString());
    // var TOKENS_PER_SOL = computeamount.currentPrice.toFixed(4);
    // this.TOKEN_PRICE = (1 / parseFloat(TOKENS_PER_SOL.toString()));
    var TOKEN_PRE_PRICE = (1 / parseFloat(TOKENS_PER_SOL.toString()));
    var denominator = 10 ** (this.tokenAccount.poolKeys!.quoteDecimals - this.tokenAccount.poolKeys!.baseDecimals);
    console.log(denominator);
    this.TOKEN_PRICE = Number((TOKEN_PRE_PRICE / denominator).toPrecision(2)).toFixed(16);
    // var liquidity = this.tokenAccount.poolKeys.
    // console.log(computeamount, TOKENS_PER_SOL, TOKEN_PRE_PRICE, denominator, this.TOKEN_PRICE, Number(this.TOKEN_PRICE).toFixed(16))
    console.log((this.RawPoolState[0].poolstate.lpReserve.toNumber() / (10 ** this.tokenAccount.poolKeys!.lpDecimals)) * (this.tokenAccount.poolKeys!.quoteDecimals - this.tokenAccount.poolKeys!.baseDecimals))
    this.PRICE_IMPACT = parseFloat(computeamount.priceImpact.toFixed(1)) < 0.1 ? '<0.1%' : `${computeamount.priceImpact.toFixed(1).toString()}%`;

  }
  onPriceEnterinSol(event: any) {
    // console.log(event.target.value, this.SOL_PRICE, this.CALCULATED_USD_PRICE)
    this.enteredPrice = parseFloat(event.target.value);
    this.CALCULATED_USD_PRICE = parseFloat(event.target.value) * this.SOL_PRICE;
  }

  buyinput() {
    if (this.enteredPrice == 0 || this.enteredPrice < 0) {
      this.toastr.warning('Enter WSOL Amount')
    } else {
      this.buy(this.enteredPrice);
    }
  }

  onPercentageEnterinSol(event: any) {
    // console.log(event.target.value, this.SOL_PRICE, this.CALCULATED_USD_PRICE)
    this.enteredPercentage = parseFloat(event.target.value);
  }

  sellinput() {
    if (this.enteredPercentage == 0 || this.enteredPercentage < 0) {
      this.toastr.warning('Enter Percentage Amount')
    } else {
      this.sell(this.enteredPercentage);
    }
  }

  onSnipePriceEnterinSol(event: any) {
    // console.log(event.target.value, this.SOL_PRICE, this.CALCULATED_USD_PRICE)
    this.enteredSnipePrice = parseFloat(event.target.value);
    this.SNIPE_CALCULATED_USD_PRICE = parseFloat(event.target.value) * this.SOL_PRICE;
  }

  snipeinput() {
    if (this.enteredSnipePrice == 0 || this.enteredSnipePrice < 0) {
      this.toastr.warning('Enter Price Amount')
    } else {
      // this.sell(this.enteredPercentage);
    }
  }

  async getPnl() {
    // const transactions = await solanaConnection.getConfirmedSignaturesForAddress2(wallet.publicKey);
    // console.log(transactions)
    // const ptransaction = await solanaConnection.getParsedTransactions(transactions.map(v => v.signature));
    // console.log(ptransaction)
    // const signatures = await solanaConnection.getSignaturesForAddress(wallet.publicKey);
    // const filtered = signatures.filter(value => value.err == null);
    // console.log('sign->', filtered);
    // const transactionSignatures = filtered.map(signature => signature.signature);
    // const parsedTransactions = await solanaConnection.getParsedTransactions(transactionSignatures);
    // console.log(parsedTransactions);
  }
  onClipboardCopy(event: boolean) {
    if (event) {
      this.toastr.info('Address Copied to clipboard', '')
      console.log('Text copied successfully');
    } else {
      console.log('Text copy failed');
    }
  }

}
