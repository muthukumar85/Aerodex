import { Component, ElementRef, ViewChild } from '@angular/core';
import { baseAddress, isloading } from '../services/tokenomics.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent {
  @ViewChild('dex') dex!: ElementRef;
  viewchart = false;
  SrcDex = 'https://dexscreener.com/solana/EYErUp5muPYEEkeaUCY22JibeZX7E9UuMcJFZkmNAN7c?embed=1&theme=dark&trades=0&info=0'
  constructor(private http: HttpClient) {

  }
  async ngAfterViewInit(): Promise<void> {
    isloading.subscribe((load) => {
      if (load == true) {
        this.viewchart = false;
      } else {
        this.viewchart = true;
      }
    });
    baseAddress.subscribe((value) => {
      if (value == '') {
        this.viewchart = false
      } else {
        this.viewchart = true;
        this.SrcDex = 'https://dexscreener.com/solana/' + value + '?embed=1&theme=dark&trades=0&info=0'
        this.dex.nativeElement.src = this.SrcDex;
      }
      let httpHeaders = new HttpHeaders({ 'Content-Type': 'application/json', });
      //       this.http.get(this.SrcDex, { headers: httpHeaders }).subscribe((value) => {
      //         if (value) {
      //           const datastr = value.toString();
      //           const startingPoint = `<script>window.__SERVER_DATA = `;
      //           const endingPoint = `</script>

      // <script id="vike_pageContext"
      //     type="application/json">`;

      //           const startIndex = datastr.indexOf(startingPoint) + startingPoint.length;
      //           const endIndex = datastr.indexOf(endingPoint);

      //           if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      //             const substring = datastr.substring(startIndex, endIndex);
      //             console.log(JSON.parse(substring)); // Output: " End cutting here."
      //           } else {
      //             console.log("Starting or ending point not found, or starting point is after ending point.");
      //           }
      //         }
      //       })

    })
  }

}
