const { 
  UNI_WBTC, UNI_DAI, UNI_USDC, UNI_USDT, DAI, THREE_CRV, 
  SCRV, RENBTC, UNI_BAC, SUSHI_MIC, SUSHI_DAI, SUSHI_USDC,
  SUSHI_USDT, SUSHI_WBTC, SUSHI_YFI, SUSHI_MIS, UNI_BAS,
  STECRV, SUSHI_YVECRV,
 } = require("./util/constants");

module.exports.jars = {
  "0xc80090aa05374d336875907372ee4ee636cbc562": {
    asset: "WBTC-ETH",
    token: UNI_WBTC,
    protocol: "uniswap",
  },
  "0xcffa068f1e44d98d3753966ebd58d4cfe3bb5162": {
    asset: "DAI-ETH",
    token: UNI_DAI,
    protocol: "uniswap",
  },
  "0x53bf2e62fa20e2b4522f05de3597890ec1b352c6": {
    asset: "USDC-ETH",
    token: UNI_USDC,
    protocol: "uniswap",
  },
  "0x09fc573c502037b149ba87782acc81cf093ec6ef": {
    asset: "USDT-ETH",
    token: UNI_USDT,
    protocol: "uniswap",
  },
  "0x6949bb624e8e8a90f87cd2058139fcd77d2f3f87": {
    asset: "cDAI",
    token: DAI,
    protocol: "compound",
  },
  "0x1bb74b5ddc1f4fc91d6f9e7906cf68bc93538e33": {
    asset: "3poolCRV",
    token: THREE_CRV,
    protocol: "curve",
  },
  "0x68d14d66b2b0d6e157c06dc8fefa3d8ba0e66a89": {
    asset: "sCRV",
    token: SCRV,
    protocol: "curve",
  },
  "0x2e35392f4c36eba7ecafe4de34199b2373af22ec": {
    asset: "renBTCCRV",
    token: RENBTC,
    protocol: "curve",
  },
  "0x55282da27a3a02ffe599f6d11314d239dac89135": {
    asset: "SLP-DAI",
    token: SUSHI_DAI,
    protocol: "sushiswap",
  },
  "0x8c2d16b7f6d3f989eb4878ecf13d695a7d504e43": {
    asset: "SLP-USDC",
    token: SUSHI_USDC,
    protocol: "sushiswap",
  },
  "0xa7a37ae5cb163a3147de83f15e15d8e5f94d6bce": {
    asset: "SLP-USDT",
    token: SUSHI_USDT,
    protocol: "sushiswap",
  },
  "0xde74b6c547bd574c3527316a2ee30cd8f6041525": {
    asset: "SLP-WBTC",
    token: SUSHI_WBTC,
    protocol: "sushiswap",
  },
  "0x3261d9408604cc8607b687980d40135afa26ffed": {
    asset: "SLP-YFI",
    token: SUSHI_YFI,
    protocol: "sushiswap",
  },
  "0x2350fc7268f3f5a6cc31f26c38f706e41547505d": {
    asset: "BAC-DAI",
    token: UNI_BAC,
    protocol: "uniswap",
  },
  "0xc66583dd4e25b3cfc8d881f6dbad8288c7f5fd30": {
    asset: "MIC-USDT",
    token: SUSHI_MIC,
    protocol: "sushiswap",
  },
  "0x0faa189afe8ae97de1d2f01e471297678842146d": {
    asset: "MIS-USDT",
    token: SUSHI_MIS,
    protocol: "sushiswap",
  },
  "0x9018ede0972f7902a852b1332a0f616bdaf4bb17": {
    asset: "BAS-DAI",
    token: UNI_BAS,
    protocol: "uniswap",
  },
  "0x77c8a58d940a322aea02dbc8ee4a30350d4239ad": {
    asset: "steCRV",
    token: STECRV,
    protocol: "curve",
  },
  "0x5eff6d166d66bacbc1bf52e2c54dd391ae6b1f48": {
    asset: "yveCRV-ETH",
    token: SUSHI_YVECRV,
    protocol: "sushiswap",
  },
};
