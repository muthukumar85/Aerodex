import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WalletComponent } from './wallet/wallet.component';
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trade', loadChildren: () => import('./trade/trade.module').then(m => m.TradeModule) },
  { path: 'wallet', component: WalletComponent }
  // { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
