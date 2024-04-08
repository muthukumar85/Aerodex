import { Component, ElementRef, ViewChild } from '@angular/core';
import { isloading, snipetokenomics, solanaConnection, subject } from '../services/tokenomics.service';
import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityStateV4, SPL_ACCOUNT_LAYOUT, SPL_MINT_LAYOUT, Token, TokenAmount, TokenList } from '@raydium-io/raydium-sdk';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, amountToUiAmount } from '@solana/spl-token';
import { BN } from 'bn.js';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tokenomics',
  templateUrl: './tokenomics.component.html',
  styleUrls: ['./tokenomics.component.css']
})
export class TokenomicsComponent {
  @ViewChild('spinner') spinner!: ElementRef;
  @ViewChild('priceinsol') priceinsol!: ElementRef;
  @ViewChild('priceinusd') priceinusd!: ElementRef;
  @ViewChild('marketcap') marketcap!: ElementRef;
  @ViewChild('top10') top10!: ElementRef;
  @ViewChild('creatorbalance') creatorbalance!: ElementRef;
  @ViewChild('circle') circle!: ElementRef;
  liquidityStatus: any = false;
  securityScore: any = 10;
  PRICE_IN_USD: any = 0.0;
  PRICE_IN_SOL: any;
  FORMATTED_PRICE_IN_SOL: any;
  SOL_IN_USD: any = 0.0;
  MARKET_CAP: any = 0;
  FDMC: any = 0;
  LIQUIDITY: any = 0;
  is_Mutable: boolean = true;
  is_Mintable: boolean = true;
  Creater_balance: any = "0%";
  TOTAL_SUPPLY: any = 0;
  PoolState: any;
  Metadata: any;
  MetadataAddress = '';
  TOKEN_NAME: string;
  RawUsdPriceOfSPL: string;
  LiquidityPercentage: string = '0%';
  supply: any = 0.0;
  TOP10HOLDERS: any = '0%';
  CREATOR_BALANCE: any = '0%';
  is_Freezable: boolean = true;
  creator_balance_draft: number = 0;
  top10_holders_draft: number = 0;
  liquidity_draft: number = 0;
  state = 'low';
  top10_holders: any = [];
  Website: any;
  Twitter: any;
  Telegram: any;
  constructor(private toastr: ToastrService) {
  }
  async ngAfterViewInit(): Promise<void> {
    this.spinner.nativeElement.style.display = 'inline';
    try {
      isloading.subscribe((load) => {
        if (load == true) {
          this.spinner.nativeElement.style.display = 'inline';
        } else {
          this.spinner.nativeElement.style.display = 'none';
        }
      });
      snipetokenomics.subscribe(async (value) => {
        if (JSON.stringify(value) != "{}") {
          this.is_Freezable
          this.Website = this.Metadata.json.extensions.website
          this.Telegram = this.Metadata.json.extensions.telegram
          this.Twitter = this.Metadata.json.extensions.twitter
          this.TOKEN_NAME = this.Metadata.symbol;
          this.is_Mutable = this.Metadata.isMutable;
          this.is_Mintable = this.Metadata.mint.mintAuthorityAddress == null ? false : true;
          this.is_Freezable = this.Metadata.mint.freezeAuthorityAddress == null ? false : true;
          this.MetadataAddress = this.Metadata.address;
          await this.getholdersdetails();
          this.calculatesecurityscore()
          this.spinner.nativeElement.style.display = 'none';
        }
      });
      subject.subscribe(async (value: any) => {
        if (JSON.stringify(value) != "{}") {
          console.log('get data', value)
          this.PRICE_IN_SOL = value.token_price
          this.SOL_IN_USD = value.sol_price;
          this.Metadata = value.tokenmeta;
          this.MetadataAddress = this.Metadata.address;

          this.PoolState = value.pooldata;
          this.setTokenData()
          var res = await Promise.all([

            this.getaccountInfo(),
            this.getholdersdetails()
          ]);
          this.calculatesecurityscore()
          this.spinner.nativeElement.style.display = 'none';
          this.Website = this.Metadata.json.extensions.website
          this.Telegram = this.Metadata.json.extensions.telegram
          this.Twitter = this.Metadata.json.extensions.twitter
        } else {

        }

      });
    } catch (e) {
      console.log(e);
    }
  }
  webclick() {
    if (this.Website == '' || this.Website == undefined || this.Website == null) {

    } else {
      window.open(this.Website, '_blank');
    }
  }

  telclick() {
    if (this.Telegram == '' || this.Telegram == undefined || this.Telegram == null) {

    } else {
      window.open(this.Telegram, '_blank');
    }
  }

  twiclick() {
    if (this.Twitter == '' || this.Twitter == undefined || this.Twitter == null) {

    } else {
      window.open(this.Twitter, '_blank');
    }
  }
  // async getCreatorBalance() {
  //   const creatoracc = await solanaConnection.getTokenAccountsByOwner(new PublicKey(this.Metadata.updateAuthorityAddress), { mint: new PublicKey(this.PoolState[0].poolstate.baseMint) });
  //   const amount = SPL_MINT_LAYOUT.decode(creatoracc.value[0].account.data).supply.div(new BN(10).pow(new BN(this.PoolState[0].poolstate.baseDecimal)))
  //   var per = (amount.div(this.supply)).mul(new BN(100));
  //   const cp = parseFloat(parseFloat(per.toString()).toFixed(1))
  //   console.log('creator->', cp, amount);
  // }
  calculatesecurityscore() {
    var secscore = 98;
    this.is_Mutable ? secscore -= 10 : null;
    this.is_Mintable ? secscore -= 20 : null;
    this.is_Freezable ? secscore -= 8 : null;
    if (this.creator_balance_draft > 100) {

    } else {
      if (this.creator_balance_draft > 40 && this.creator_balance_draft <= 100) {
        secscore -= 20
      }
      else {
        if (this.creator_balance_draft > 15 && this.creator_balance_draft <= 40) {
          secscore -= 15
        }
        else {
          if (this.creator_balance_draft <= 15) {
            secscore -= 10
          }
        }
      }
    }

    if (this.top10_holders_draft > 40 && this.top10_holders_draft <= 100) {
      secscore -= 10
    }
    else {
      if (this.top10_holders_draft > 15 && this.top10_holders_draft <= 40) {
        secscore -= 5
      }
      else {
        if (this.top10_holders_draft <= 15) {
          secscore -= 0
        }
      }
    }

    this.liquidityStatus == false ? secscore -= 20 : null;

    if (this.liquidityStatus == true) {
      if (this.liquidity_draft >= 90) {

      } else {
        if (this.liquidity_draft < 90 && this.liquidity_draft >= 70) {
          secscore -= 4;
        }
        else {
          if (this.liquidity_draft < 70) {
            secscore -= 9
          }
        }
      }
    } else {
      secscore -= 10;
    }
    if (secscore < 10) {
      secscore = 10
    }
    this.securityScore = secscore;
    if (secscore >= 90) {
      this.state = 'high'
    } else {
      if (secscore >= 70 && secscore < 90) {
        this.state = 'mid'
      } else {
        if (secscore < 70) {
          this.state = 'low'
        }
      }
    }
  }
  async getholdersdetails() {
    const tokenAccounts = await solanaConnection.getTokenLargestAccounts(new PublicKey(this.PoolState[0].poolstate.baseMint))
    console.log('tokenAcconuts->', tokenAccounts)

    tokenAccounts.value.forEach((value) => {
      if (value.address.toString() == this.Metadata.updateAuthorityAddress) {
        const creator_b = parseFloat(value.uiAmountString!)
        console.log('creator_b ->', creator_b);
        var per = (creator_b / this.supply.toNumber()) * 100;
        const top1 = parseFloat(parseFloat(per.toString()).toFixed(1))
        if (top1 <= 15) {
          this.creatorbalance.nativeElement.style.color = 'var(--aero-colors-whatsapp-300)'
        } else {
          if (top1 > 15 && top1 <= 40) {
            this.creatorbalance.nativeElement.style.color = '#fca311';
          } else {
            if (top1 > 40) {
              this.creatorbalance.nativeElement.style.color = 'var(--aero-colors-red-450)'
            }
          }
        }
        this.CREATOR_BALANCE = top1.toString() + '%';
        this.creator_balance_draft = top1;
      } else {
        this.CREATOR_BALANCE = 'LOW';
        this.creator_balance_draft = 101;
        this.creatorbalance.nativeElement.style.color = 'var(--aero-colors-whatsapp-300)'

      }
    })
    var top10holders = 0.00;
    tokenAccounts.value.forEach((value, index) => {
      if (index < 10) {
        top10holders += value.uiAmount!
        if (index == 9) {
          var per = (top10holders / this.supply.toNumber()) * 100;
          const top10 = parseFloat(parseFloat(per.toString()).toFixed(1))
          if (top10 <= 15) {
            this.top10.nativeElement.style.color = 'var(--aero-colors-whatsapp-300)'
          } else {
            if (top10 > 15 && top10 <= 40) {
              this.top10.nativeElement.style.color = '#fca311';
            } else {
              if (top10 > 40) {
                this.top10.nativeElement.style.color = 'var(--aero-colors-red-450)'
              }
            }
          }
          this.top10_holders_draft = top10;
          this.TOP10HOLDERS = top10.toString() + '%';
        }

        var perc = (value.uiAmount! / this.supply.toNumber()) * 100;
        const accper = perc.toFixed(1) + '%'
        var modifiedadd = value.address.toString().slice(0, 5) + '...' + value.address.toString().slice(-5)
        var color = 'red';
        if (perc <= 5) {
          color = 'var(--aero-colors-whatsapp-300)'
        } else {
          if (perc > 5 && perc <= 20) {
            color = '#fca311';
          } else {
            if (perc > 20) {
              color = 'var(--aero-colors-red-450)'
            }
          }
        }
        this.top10_holders.push({
          "percentage": accper,
          "index": index + 1,
          "address": value.address.toString(),
          "mod_add": modifiedadd,
          "color": color
        });
      }
    });
  }
  onClipboardCopy(event: boolean) {
    if (event) {
      this.toastr.info('Address Copied to clipboard', '')
      console.log('Text copied successfully');
    } else {
      console.log('Text copy failed');
    }
  }
  async getaccountInfo() {
    const lpsupply = await solanaConnection.getAccountInfo(new PublicKey(this.PoolState[0].poolstate.lpMint));
    const lpdecodeddata = SPL_MINT_LAYOUT.decode(lpsupply!.data)
    const lpReserve = this.PoolState[0].poolstate.lpReserve.div(new BN(10).pow(new BN(lpdecodeddata.decimals)))
    const calculatedlp = lpdecodeddata.supply.div(new BN(10).pow(new BN(lpdecodeddata.decimals)))
    // console.log('lp supply ->', calculatedlp.toNumber(), lpReserve.toNumber())
    const totallp = lpReserve.toNumber() * Number(this.RawUsdPriceOfSPL);
    // console.log('lp total supply ->', totallp)
    const total2lp = this.PoolState[0].poolstate.baseLotSize.add(this.PoolState[0].poolstate.quoteLotSize)
    // console.log('lp total supply 2 ->', total2lp.toNumber() * Number(this.RawUsdPriceOfSPL))
    // if (calculatedlp.toNumber() == 0) {
    //   this.liquidityStatus = true
    //   this.LiquidityPercentage = '100%'
    //   this.liquidity_draft = 100
    // } else {
    if (calculatedlp < lpReserve) {

      this.liquidityStatus = true
      const per = calculatedlp.toNumber() / lpReserve.toNumber();
      console.log(per)
      const str = 100 - (per * 100)
      this.liquidity_draft = str;
      this.LiquidityPercentage = parseInt(str.toString()).toString() + '%';
      if (str <= 1) {
        this.liquidityStatus = false
        this.LiquidityPercentage = '99%'
        this.liquidity_draft = 99
      }
    }
    else {
      this.liquidityStatus = false
      this.LiquidityPercentage = '100%'
      this.liquidity_draft = 100
    }


  }

  setTokenData() {
    this.TOKEN_NAME = this.Metadata.symbol;
    this.is_Mutable = this.Metadata.isMutable;
    this.is_Mintable = this.Metadata.mint.mintAuthorityAddress == null ? false : true;
    this.priceinsol.nativeElement.innerHTML = this.formateDecimalValue(this.PRICE_IN_SOL) + ' SOL';
    var usd_price = (parseFloat(this.PRICE_IN_SOL) * parseFloat(this.SOL_IN_USD)).toPrecision(2);
    this.RawUsdPriceOfSPL = (parseFloat(this.PRICE_IN_SOL) * parseFloat(this.SOL_IN_USD)).toPrecision(10);
    this.priceinusd.nativeElement.innerHTML = '$' + this.formateDecimalValue(usd_price);
    this.supply = this.Metadata.mint.supply.basisPoints.div(new BN(10).pow(new BN(this.PoolState[0].poolstate.baseDecimal)))
    this.marketcap.nativeElement.innerHTML = '$' + this.formateDecimalValue(this.supply.toNumber() * Number(this.RawUsdPriceOfSPL))
    this.is_Freezable = this.Metadata.mint.freezeAuthorityAddress == null ? false : true;
    // console.log(this.Metadata.mint.supply.basisPoints.toString())
    // console.log(this.PoolState[0].poolstate.lpReserve.toNumber())
    // const baseLiquidity = this.PoolState[0].poolstate.amountWaveRatio.div(new BN(10).pow(this.PoolState[0].poolstate.baseDecimal));
    // const quoteLiquidity = this.PoolState[0].poolstate.amountWaveRatio.mul(new BN(10).pow(this.PoolState[0].poolstate.quoteDecimal)).div(new BN(10).pow(this.PoolState[0].poolstate.baseDecimal));

    // console.log('base liquidity ->', baseLiquidity.toNumber(), quoteLiquidity.toNumber());
    // console.log(this.Metadata.mint.supply.basisPoints.mul(Number(usd_price).toPrecision(2)))
    // this.marketcap.nativeElement.innerHTML = '$' + this.formateDecimalValue(this.Metadata.mint.supply.basisPoints.mul(new BN(usd_price)).toFixed(2));
    // const baseLiquidity = new TokenAmount(
    //   new Token(TOKEN_PROGRAM_ID, new PublicKey(this.PoolState[0].poolstate.baseVault), this.PoolState[0].poolstate.baseDecimal,),
    //   this.PoolState[0].poolstate.baseLotSize.toNumber(),
    //   false
    // );
    // const quoteLiquidity = new TokenAmount(
    //   new Token(TOKEN_PROGRAM_ID, new PublicKey(this.PoolState[0].poolstate.quoteVault), this.PoolState[0].poolstate.quoteDecimal,),
    //   this.PoolState[0].poolstate.quoteLotSize.toNumber(),
    //   false
    // );
    // console.log(this.PoolState[0].poolstate.lpReserve.toNumber())
    // // this.liquidity.nativeElement.innerHTML = this.formateDecimalValue(((baseLiquidity.numerator.toNumber() / baseLiquidity.denominator.toNumber()) + (quoteLiquidity.numerator.toNumber() / quoteLiquidity.denominator.toNumber())).toPrecision());
    // this.liquidity.nativeElement.innerHTML = this.formateDecimalValue((parseInt(baseLiquidity.toFixed(1)) + parseInt(quoteLiquidity.toFixed(1))).toPrecision(2));



  }
  formateDecimalValue(num: any) {
    // const numberString = this.PRICE_IN_SOL.toString();
    const NUM_VALUE = num.toString().replace(/\.?0+$/, '');
    const numberString = NUM_VALUE;
    const decimalPointIndex = numberString.indexOf(".");
    const numberOfZeros = numberString.substring(decimalPointIndex + 1).match(/0/g)?.length || 0;
    console.log(`Number of zeros after the decimal point: ${numberOfZeros}`, num, NUM_VALUE);
    if (parseInt(NUM_VALUE) == 0) {
      if (numberOfZeros > 2) {
        const sub = numberOfZeros.toString().sub();
        const lastvalue = parseInt(NUM_VALUE.toString().slice(-2));
        return `0.0${sub}${lastvalue}`
      }
      else {
        return NUM_VALUE.toString()
      }
    }
    else {
      if (parseInt(NUM_VALUE) < 1000) {

        return Number(NUM_VALUE).toPrecision(2)
      } else {
        return this.formatKsMsNumber(NUM_VALUE)
      }
    }


  }

  formatKsMsNumber(value: number): string {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B'
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'K';
    } else {
      return value.toString();
    }
  }

}
