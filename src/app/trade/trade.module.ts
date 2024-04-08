import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TradeRoutingModule } from './trade-routing.module';
import { TradeComponent } from './trade.component';
import { TradeHeaderComponent } from './trade-header/trade-header.component';
import { TokenomicsComponent } from './tokenomics/tokenomics.component';
import { ChartComponent } from './chart/chart.component';
import { TradePanelComponent } from './trade-panel/trade-panel.component';
import { TransactionPanelComponent } from './transaction-panel/transaction-panel.component';
import { HttpClientModule } from '@angular/common/http';
import { TokenomicsService } from './services/tokenomics.service';
import { ToastrModule } from 'ngx-toastr'; import { ClipboardModule } from '@angular/cdk/clipboard';


@NgModule({
  declarations: [
    TradeComponent,
    TradeHeaderComponent,
    TokenomicsComponent,
    ChartComponent,
    TradePanelComponent,
    TransactionPanelComponent
  ],
  imports: [
    CommonModule,
    TradeRoutingModule,
    HttpClientModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right', // Position of toasts
      preventDuplicates: false,         // Prevent duplicate toasts
      progressBar: false,               // Show a progress bar
      closeButton: true,
    }),
    ClipboardModule
  ],
  providers: [
    TokenomicsService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TradeModule { }
