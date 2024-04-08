// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  API_URL: 'http://localhost:3000/',
  // PRIVATE_KEY: '34jxePFX72eYSaMZfh6CFPhNP3YSnTX7niNQmf6uQoj5oXfUensY3Hi4naLRuBPKN7xn14GakkN4EfVSrq34Jq81',
  RPC_ENDPOINT: 'https://polished-maximum-night.solana-mainnet.quiknode.pro/8d1b7cb33dfe00d42ea2f4b5f0530758d9abc15c/',
  RPC_WEBSOCKET_ENDPOINT: 'wss://polished-maximum-night.solana-mainnet.quiknode.pro/8d1b7cb33dfe00d42ea2f4b5f0530758d9abc15c/',
  // RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
  // RPC_WEBSOCKET_ENDPOINT: 'https://api.mainnet-beta.solana.com',
  QUOTE_MINT: 'WSOL',
  QUOTE_AMOUNT: 0.0001,
  COMMITMENT_LEVEL: 'finalized',
  USE_SNIPE_LIST: true,
  SNIPE_LIST_REFRESH_INTERVAL: 10000,
  CHECK_IF_MINT_IS_RENOUNCED: false,
  AUTO_SELL: false,
  SELL_DELAY: 2000,
  PHOTON: "3PgRoya7HKiTiNMU25veYpJz7ctJ1fYSqjkmjhTEuotxzNdwCRLGPDAB3rXC1Y9Akb81vDJeHoMPSEnsBtbRVEfD",
  SECRET_KEY: "41121819"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
