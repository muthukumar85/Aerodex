import { Injectable } from '@angular/core';

import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class LocalService {
  sec_key: string = environment.PHOTON;
  constructor() { }
  public saveData(key: string, value: string) {
    localStorage.setItem(key, this.encrypt(value));
  }

  public getData(key: string) {
    let data = localStorage.getItem(key) || "";
    return this.decrypt(data);
  }
  public removeData(key: string) {
    localStorage.removeItem(key);
  }

  public clearData() {
    localStorage.clear();
  }

  private encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(txt, this.sec_key).toString();
  }

  private decrypt(txtToDecrypt: string) {
    return CryptoJS.AES.decrypt(txtToDecrypt, this.sec_key).toString(CryptoJS.enc.Utf8);
  }

}
