import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { HeaderComponent } from './header/header.component';
import { HttpClientModule } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TradeModule } from './trade/trade.module';
import { WalletComponent } from './wallet/wallet.component';
import { LocalService } from './local-services/local.service';
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    WalletComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right', // Position of toasts
      preventDuplicates: true,         // Prevent duplicate toasts
      progressBar: false,               // Show a progress bar
      closeButton: true,
    }),
    TradeModule
  ],
  providers: [LocalService],
  bootstrap: [AppComponent]
})
export class AppModule { }
