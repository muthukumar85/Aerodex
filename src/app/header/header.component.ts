import { Component } from '@angular/core';
import { environment } from '../../environments/environment';
import { LocalService } from '../local-services/local.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  isWalletConnected = false;
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
}
