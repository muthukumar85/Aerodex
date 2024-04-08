import { Component, ElementRef, ViewChild } from '@angular/core';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ToastrService } from 'ngx-toastr';
import { LocalService } from '../local-services/local.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent {
  constructor(private toastr: ToastrService, private local: LocalService, private router: Router) { }
  onSubmit(event: any) {
    try {
      console.log(event);
      const PRIVATE_KEY = event;
      const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
      this.toastr.success(wallet.publicKey.toString().slice(0, 5) + '.....' + wallet.publicKey.toString().slice(-5), 'Wallet Connected')
      this.local.saveData('wallet', PRIVATE_KEY.toString());
      this.router.navigate(['/trade'], { queryParams: { token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' } })

    } catch (e) {
      console.log(e)
      this.toastr.error('Private key is not available', 'Invalid Private Key')
    }
  }
}
