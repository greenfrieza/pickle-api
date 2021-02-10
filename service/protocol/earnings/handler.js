const fetch = require("node-fetch");
const { jars } = require("../../jars");
const { getContractPrice, getUniswapPrice, respond, getSushiswapPrice, getTokenPrice } = require("../../util/util");
const {
  WETH, SCRV, THREE_CRV, DAI, STECRV, UNI_DAI, UNI_USDC, UNI_USDT, UNI_WBTC,
  RENBTC, UNI_BAC, UNI_BAS, SUSHI_MIC, SUSHI_DAI, SUSHI_USDC, SUSHI_USDT,
  SUSHI_WBTC, SUSHI_YFI, SUSHI_MIS, SUSHI_YVECRV
} = require("../../util/constants");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const userId = event.pathParameters.userId;
  const userData = await getUserData(userId.toLowerCase());
  console.log('Earnings ' + userId);
  
  if (userData.data == null || userData.data.user == null) {
    return respond(404);
  }

  const data = userData.data.user;
  const prices = await getPrices();
  const jarEarnings = data.jarBalances.filter(d => jars[d.jar.id].asset.toLowerCase() !== 'cdai').map(data => {
    const asset = jars[data.jar.id].asset;
    const jarRatio = parseInt(data.jar.ratio) / Math.pow(10, 18);
    const netShareDeposit = parseInt(data.netShareDeposit);
    const grossDeposit = parseInt(data.grossDeposit);
    const grossWithdraw = parseInt(data.grossWithdraw);
    const jarTokens = jarRatio * netShareDeposit;
    const earned = (jarTokens - grossDeposit + grossWithdraw) / Math.pow(10, 18);
    const earnedUsd = getUsdValue(data.jar.token.id, earned, prices);
    const balance = jarTokens / 1e18;
    const balanceUsd = getUsdValue(data.jar.token.id, balance, prices);
    return {
      id: data.jar.id,
      asset: asset,
      balance: balance,
      balanceUsd: balanceUsd,
      earned: earned,
      earnedUsd: earnedUsd,
    };
  });

  const wethRewards = data.wethRewards / Math.pow(10, 18);
  const wethEarningsUsd = wethRewards * prices.ethereum;
  const wethEarnings = {
    asset: "WETH",
    earned: wethRewards,
    earnedUsd: wethEarningsUsd,
  };
  jarEarnings.push(wethEarnings);

  let jarEarningsUsd = 0;
  if (jarEarnings && jarEarnings.length > 0) {
    jarEarningsUsd = jarEarnings.map(jar => jar.earnedUsd).reduce((total, earnedUsd) => total + earnedUsd);
  }

  const user = {
    userId: userId,
    earnings: jarEarningsUsd,
    jarEarnings: jarEarnings
  };

  return respond(200, user);
}

const getUsdValue = (asset, tokens, prices) => {
  let earnedUsd;
  switch (asset) {
    case SCRV:
      earnedUsd = tokens * prices.scrv;
      break;
    case THREE_CRV:
      earnedUsd = tokens * prices.tcrv;
      break;
    case DAI:
      earnedUsd = tokens * prices.dai;
      break;
    case STECRV:
      earnedUsd = tokens * prices.stecrv;
      break;
    case UNI_DAI:
      earnedUsd = tokens * prices.unidai;
      break;
    case UNI_USDC:
      earnedUsd = tokens * prices.uniusdc;
      break;
    case UNI_USDT:
      earnedUsd = tokens * prices.uniusdt;
      break;
    case UNI_WBTC:
      earnedUsd = tokens * prices.uniwbtc;
      break;
    case RENBTC:
      earnedUsd = tokens * prices.renbtccrv;
      break;
    case UNI_BAC:
      earnedUsd = tokens * prices.unibac;
      break;
    case UNI_BAS:
      earnedUsd = tokens * prices.unibas;
      break;
    case SUSHI_MIC:
      earnedUsd = tokens * prices.sushimic;
      break;
    case SUSHI_DAI:
      earnedUsd = tokens * prices.sushidai;
      break;
    case SUSHI_USDC:
      earnedUsd = tokens * prices.sushiusdc;
      break;
    case SUSHI_USDT:
      earnedUsd = tokens * prices.sushiusdt;
      break;
    case SUSHI_WBTC:
      earnedUsd = tokens * prices.sushiwbtc;
      break;
    case SUSHI_YFI:
      earnedUsd = tokens * prices.sushiyfi;
      break;
    case SUSHI_MIS:
      earnedUsd = tokens * prices.sushimis;
      break;
    case SUSHI_YVECRV:
      earnedUsd = tokens * prices.sushiyvecrv;
      break;
    default:
      earnedUsd = 0;
  }
  return earnedUsd;
};

const getPrices = async () => {
  const prices = await Promise.all([
    getContractPrice(WETH),
    getContractPrice(SCRV),
    getContractPrice(THREE_CRV),
    getContractPrice(RENBTC),
    getContractPrice(DAI),
    getTokenPrice('ethereum'),
    getUniswapPrice(UNI_DAI),
    getUniswapPrice(UNI_USDC),
    getUniswapPrice(UNI_USDT),
    getUniswapPrice(UNI_WBTC),
    getUniswapPrice(UNI_BAC),
    getUniswapPrice(UNI_BAS),
    getSushiswapPrice(SUSHI_MIC),
    getSushiswapPrice(SUSHI_DAI),
    getSushiswapPrice(SUSHI_USDC),
    getSushiswapPrice(SUSHI_USDT),
    getSushiswapPrice(SUSHI_WBTC),
    getSushiswapPrice(SUSHI_YFI),
    getSushiswapPrice(SUSHI_MIS),
    getSushiswapPrice(SUSHI_YVECRV)
  ]);
  return {
    ethereum: prices[0],
    scrv: prices[1],
    tcrv: prices[2],
    renbtccrv: prices[3],
    stecrv: prices[4],
    dai: prices[5],
    unidai: prices[6],
    uniusdc: prices[7],
    uniusdt: prices[8],
    uniwbtc: prices[9],
    unibac: prices[10],
    unibas: prices[11],
    sushimic: prices[12],
    sushidai: prices[13],
    sushiusdc: prices[14],
    sushiusdt: prices[15],
    sushiwbtc: prices[16],
    sushiyfi: prices[17],
    sushimis: prices[18],
    sushiyvecrv: prices[19]
  };
};

const getUserData = async (userId) => {
  const query = `
    {
      user(id: "${userId}") {
        jarBalances(orderDirection: asc) {
          jar {
            id
            name
            ratio
            symbol
            token {
              id
            }
          }
          netDeposit
          grossDeposit
          grossWithdraw
          netShareDeposit
          grossShareDeposit
          grossShareWithdraw
        }
        staked
        sCrvRewards
        wethRewards
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};
