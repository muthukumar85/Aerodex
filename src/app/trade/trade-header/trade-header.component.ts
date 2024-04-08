import { Component } from '@angular/core';
import { LocalService } from '../../local-services/local.service';
import { Router } from '@angular/router';
import { solbalance } from '../services/tokenomics.service';

@Component({
  selector: 'app-trade-header',
  templateUrl: './trade-header.component.html',
  styleUrls: ['./trade-header.component.css']
})
export class TradeHeaderComponent {
  isWalletConnected = false;
  SOL: any = 0.0;
  WSOL: any = 0.0;
  constructor(private local: LocalService, private router: Router) {
    if (this.local.getData('wallet') == '') {
      this.isWalletConnected = false;
    } else {
      this.isWalletConnected = true;
    }
  }

  disconnect() {
    this.local.removeData('wallet');
    // environment.PRIVATE_KEY = '';
    this.router.navigate(['/wallet']);
  }
  async ngAfterViewInit(): Promise<void> {
    try {
      solbalance.subscribe((value) => {
        this.SOL = value.sol.toPrecision(2)
        this.WSOL = value.wsol.toPrecision(2)
      })
    }
    catch (e) {

    }

  }
}
