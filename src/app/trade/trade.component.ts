import { Component, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import * as $ from 'jquery';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalService } from '../local-services/local.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-trade',
  templateUrl: './trade.component.html',
  styleUrls: ['./trade.component.css']
})
export class TradeComponent {
  @ViewChild('chart', { static: false }) chart!: ElementRef;
  @ViewChild('resizer', { static: false }) resizer!: ElementRef;
  @ViewChild('main', { static: false }) main!: ElementRef;
  @ViewChild('transactionpanel', { static: false }) transactionpanel!: ElementRef;
  ismdwn: any = 0;
  token: any;
  constructor(private elementRef: ElementRef, private router: Router, private activatedRoute: ActivatedRoute, private local: LocalService, private toastr: ToastrService) {

    // const currentUrl = this.router.url;
    // const queryParams = { token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' };
    // this.router.navigate(['/trade'], { queryParams: queryParams });
    const wallet = this.local.getData('wallet');
    if (wallet == '') {
      this.router.navigate(['/wallet']);
      this.toastr.warning('Connect the Wallet', 'Wallet Not Found')
    }
  }

  // topCurrentHeight = 0;
  // bottomCurrentHeight = 0;
  // currentPosition = 0;
  // newPosition = 0;
  // direction = 'Released';

  // getDivPosition(mouse: any) {
  //   this.direction = 'Pressed';
  //   this.currentPosition = mouse.pageY;
  //   var topTempHeight = $('.chart').css('height');
  //   console.log(topTempHeight)
  //   const topHeightArray = topTempHeight.split('p');
  //   this.topCurrentHeight = parseInt(topHeightArray[0]);
  //   var bottomTempHeight = $('.transaction-panel').css('height');
  //   const bottomHeightArray = bottomTempHeight.split('p');
  //   this.bottomCurrentHeight = parseInt(bottomHeightArray[0]);
  // }

  // SetDivPosition(mouse: any) {
  //   if (this.direction == 'Pressed') {
  //     this.newPosition = mouse.pageY;
  //     var movePerPixels = this.newPosition - this.currentPosition;
  //     var topDivNewLocation = this.topCurrentHeight + movePerPixels;
  //     if (topDivNewLocation < 10) {
  //       $('.chart').css('height', '10px');
  //     }
  //     var bottomDivNewLocation = this.bottomCurrentHeight - movePerPixels;
  //     if (bottomDivNewLocation < 10) {
  //       $('.transaction-panel').css('height', '10px');
  //     }
  //     else {
  //       $('.chart').css('height', topDivNewLocation + 'px');
  //       $('.transaction-panel').css('height', bottomDivNewLocation + 'px');
  //     }
  //   }
  // }
  // Rel() {
  //   this.direction = 'Released';
  // }

  ngAfterViewInit() {
    // this.resizer.nativeElement.addEventListener("mousedown", this.mD.bind(this));

  }

  mD(event: any) {
    this.ismdwn = 1
    const mainele = this.main.nativeElement;
    mainele.addEventListener('mousemove', this.mV.bind(this));
    mainele.addEventListener('mouseup', this.end.bind(this));
  }

  mV(event: any) {
    const chartele = this.chart.nativeElement;
    if (this.ismdwn === 1) {
      var data = (event.clientY - 10).toString() + "px";
      chartele.style.flexBasis = data;
    } else {
      this.end()
    }
  }
  end() {
    this.ismdwn = 0
    this.main.nativeElement.removeEventListener('mouseup', this.end.bind(this))
    this.resizer.nativeElement.removeEventListener('mousemove', this.mV.bind(this))
  }

}


