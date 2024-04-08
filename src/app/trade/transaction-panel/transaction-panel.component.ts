import { Component, ElementRef, ViewChild } from '@angular/core';
import { buyselltxns, isloading, splAccounts, txnspanel } from '../services/tokenomics.service';
import { TokenAccountBalancePair } from '@solana/web3.js';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RAYDIUM_MAINNET, TradeV2 } from '@raydium-io/raydium-sdk';
import { PublicKey } from '@metaplex-foundation/js';
import BN from 'bn.js';

@Component({
  selector: 'app-transaction-panel',
  templateUrl: './transaction-panel.component.html',
  styleUrls: ['./transaction-panel.component.css']
})
export class TransactionPanelComponent {
  @ViewChild('positions') positions!: ElementRef;
  @ViewChild('history') history!: ElementRef;
  @ViewChild('transactions') transactions!: ElementRef;
  @ViewChild('positionsBtn') PositionsBtn!: ElementRef;
  @ViewChild('historyBtn') historyBtn!: ElementRef;
  @ViewChild('transactionsBtn') transactionsBtn!: ElementRef;
  @ViewChild('pquantity') pquantity!: ElementRef;
  @ViewChild('pvalue') pvalue!: ElementRef;
  @ViewChild('pmprice') pmprice!: ElementRef;
  @ViewChild('punreal') punreal!: ElementRef;
  @ViewChild('spinner') spinner!: ElementRef;
  validTokenAccounts: any = [];
  TransactionList: any = [];
  supply: any = 0.0;
  RawUsdPriceOfSPL: string;
  TOKEN_NAME: string = '-';
  Metadata: any;
  TOTAL_SUPPLY: any = 0;
  SOL_IN_USD: any = 0.0;
  PRICE_IN_USD: any = 0.0;
  PRICE_IN_SOL: any;
  PoolState: any;
  tokenAccount: any = [];
  isdata: boolean = false;
  SnipeTransactionList: any = [];


  constructor(private http: HttpClient) {

  }
  positionsclick() {
    this.transactions.nativeElement.style.display = 'none'
    this.history.nativeElement.style.display = 'none'
    this.positions.nativeElement.style.display = 'block'
    this.PositionsBtn.nativeElement.style.borderColor = '#fca311'
    this.PositionsBtn.nativeElement.style.color = '#ffffff'
    this.historyBtn.nativeElement.style.borderColor = 'transparent'
    this.transactionsBtn.nativeElement.style.borderColor = 'transparent'
  }

  historyclick() {
    this.transactions.nativeElement.style.display = 'none'
    this.history.nativeElement.style.display = 'block'
    this.positions.nativeElement.style.display = 'none'
    this.PositionsBtn.nativeElement.style.borderColor = 'transparent'
    this.historyBtn.nativeElement.style.borderColor = '#fca311'
    this.historyBtn.nativeElement.style.color = '#ffffff'
    this.transactionsBtn.nativeElement.style.borderColor = 'transparent'
  }

  transactionsclick() {
    this.transactions.nativeElement.style.display = 'block'
    this.history.nativeElement.style.display = 'none'
    this.positions.nativeElement.style.display = 'none'
    this.PositionsBtn.nativeElement.style.borderColor = 'transparent'
    this.historyBtn.nativeElement.style.borderColor = 'transparent'
    this.transactionsBtn.nativeElement.style.borderColor = '#fca311'
    this.transactionsBtn.nativeElement.style.color = '#ffffff'
  }

  ngAfterViewInit(): void {
    this.positionsclick();
    isloading.subscribe((load) => {
      if (load == true) {
        this.spinner.nativeElement.style.display = 'inline';
      } else {
        this.spinner.nativeElement.style.display = 'none';
      }
    });
    splAccounts.subscribe((value) => {
      console.log(value);
      this.validTokenAccounts = value;
      // this.getPriceData(value)
    });
    buyselltxns.subscribe((txns) => {
      this.setTransactionPanel(txns);
    });
    txnspanel.subscribe(async (response: any) => {

      try {
        this.isdata = false;
        this.Metadata = response.tokenmeta;
        this.PRICE_IN_SOL = response.token_price
        this.SOL_IN_USD = response.sol_price;
        this.PoolState = response.pooldata;
        this.setPriceData()

        this.spinner.nativeElement.style.display = 'none';
      } catch (e) {
        console.log(e)
        // this.spinner.nativeElement.style.display = 'none';
      }

    });
  }
  setTransactionPanel(value: any) {
    if (value.signature) {
      this.historyclick();
      if (value.status == 'loading') {
        this.TransactionList.unshift(value);
      } else {
        const index = this.TransactionList.findIndex((item: any) => item?.signature === value.signature);

        if (index !== -1) {
          this.TransactionList[index].status = value.status;
        }
      }
    }
  }
  setSnipeTransactionPanel(value: any) {
    if (value.signature) {
      this.transactionsclick();
      if (value.status == 'loading') {
        this.SnipeTransactionList.unshift(value);
      } else {
        const index = this.SnipeTransactionList.findIndex((item: any) => item?.signature === value.signature);

        if (index !== -1) {
          this.SnipeTransactionList[index].status = value.status;
        }
      }
    }
  }
  setPriceData() {

    this.validTokenAccounts.forEach((element: any) => {

      if (element?.accountInfo?.mint.toString() == this.Metadata.address.toString()) {
        // this.priceinsol.nativeElement.innerHTML = this.formateDecimalValue(this.PRICE_IN_SOL) + ' SOL';
        this.TOKEN_NAME = this.Metadata.symbol;
        var usd_price = (parseFloat(this.PRICE_IN_SOL) * parseFloat(this.SOL_IN_USD)).toPrecision(2);
        this.RawUsdPriceOfSPL = (parseFloat(this.PRICE_IN_SOL) * parseFloat(this.SOL_IN_USD)).toPrecision(10);
        // this.priceinusd.nativeElement.innerHTML = '$' + this.formateDecimalValue(usd_price);
        this.supply = this.Metadata.mint.supply.basisPoints.div(new BN(10).pow(new BN(this.PoolState[0].poolstate.baseDecimal)))
        this.TOTAL_SUPPLY = element.accountInfo.amount.div(new BN(10).pow(new BN(this.PoolState[0].poolstate.baseDecimal)))
        var pquantity = this.formateDecimalValue(this.TOTAL_SUPPLY.toNumber())
        var prevalue = this.TOTAL_SUPPLY.toNumber() * Number(usd_price);
        var value = '$' + this.formateDecimalValue(prevalue);
        var pvalue = value
        var pmprice = this.formateDecimalValue(usd_price);
        let actualValue = parseFloat(usd_price.slice(0, usd_price.indexOf('e')));
        console.log(actualValue);
        console.log(Number(usd_price), usd_price);
        var punreal = value

        this.pquantity.nativeElement.innerHTML = pquantity;
        this.pvalue.nativeElement.innerHTML = value;
        this.pmprice.nativeElement.innerHTML = pmprice;
        this.punreal.nativeElement.innerHTML = value;
        this.tokenAccount.push({
          "token_name": this.TOKEN_NAME,
          "quantity": pquantity,
          "value": pvalue,
          "markprice": pmprice,
          "unreal": punreal
        })
        if (this.tokenAccount.length > 0) {
          this.isdata = true
        }
      }

    });


  }
  getPriceData(value: any) {

    // value.forEach((element: any) => {

    //   // console.log('element->', element)
    //   //@ts-ignore
    //   // const tokendata = element.account?.data?.parsed?.info?.tokenAmount;
    //   // const supply = parseFloat(tokendata.uiAmount);
    //   // let httpHeaders = new HttpHeaders({ 'Content-Type': 'application/json', });
    //   // this.http.get('https://quote-api.jup.ag/v6' + 'inputMint=' + element.account.data.parsed.info.mint + '&outputMint=So11111111111111111111111111111111111111112&amount=1000000', { headers: httpHeaders })
    // });
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

  formatNumberWithoutExponential(num: any) {
    const strNum = num.toString();
    const indexOfE = strNum.indexOf('e');

    if (indexOfE !== -1) {
      const exponent = parseInt(strNum.slice(indexOfE + 1));
      const integerPart = strNum.slice(0, indexOfE).replace('.', '');
      let result;

      if (exponent >= 0) {
        result = integerPart + '0'.repeat(exponent);
      } else {
        const decimalIndex = integerPart.length + exponent;
        result = integerPart.slice(0, decimalIndex) + '.' + integerPart.slice(decimalIndex);
      }

      const decimalPointIndex = result.indexOf('.');
      const precision = decimalPointIndex === -1 ? 0 : result.length - decimalPointIndex - 1;
      return parseFloat(result).toFixed(precision);
    }

    const decimalPointIndex = strNum.indexOf('.');
    const precision = decimalPointIndex === -1 ? 0 : strNum.length - decimalPointIndex - 1;
    return num.toFixed(precision);
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
