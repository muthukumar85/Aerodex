import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TradeComponent } from './trade.component';


const routes: Routes = [
  { path: '', component: TradeComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TradeRoutingModule { }
