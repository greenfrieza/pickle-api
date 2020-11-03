const fetch = require("node-fetch");
const { jars } = require("../../jars");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const userId = event.pathParameters.userId;
  const userData = await getUserData(userId);
  
  if (userData.data == null || userData.data.user == null) {
    return {
      statusCode: 404,
      headers: headers,
    }
  }

  const data = userData.data.user;
  const scrvRewards = data.sCrvRewards / Math.pow(10, 18);
  const wethRewards = data.wethRewards / Math.pow(10, 18);

  const jarEarnings = await Promise.all(data.jarBalances.map(async data => {
    const asset = jars[data.jar.id].asset;
    const jarRatio = parseInt(data.jar.ratio) / Math.pow(10, 18);
    const netShareDeposit = parseInt(data.netShareDeposit);
    const grossDeposit = parseInt(data.grossDeposit);
    const grossWithdraw = parseInt(data.grossWithdraw);
    const jarTokens = jarRatio * netShareDeposit;
    const earned = (jarTokens - grossDeposit + grossWithdraw) / Math.pow(10, 18);

    let earnedUsd;
    if (data.jar.symbol == "pUNI-V2") {
      earnedUsd = earned * await getUniswapPrice(data.jar.token.id);
    } else if (data.jar.symbol == "pcrvRenWBTC") {
      earnedUsd = earned * await getBtcPrice();
    } else {
      earnedUsd = earned;
    }

    return {
      id: data.jar.id,
      asset: asset,
      earned: earned,
      earnedUsd: earnedUsd,
    };
  }));

  const jarEarningsUsd = jarEarnings ? jarEarnings.map(jar => jar.earnedUsd).reduce((total, earnedUsd) => total + earnedUsd) : 0;
  const wethEarningsUsd = wethRewards * await getEthPrice();
  const earnings = jarEarningsUsd + wethEarningsUsd + scrvRewards;
  const user = {
    userId: userId,
    earnings: earnings,
    scrvRewards: scrvRewards,
    wethRewards: wethRewards,
    jarEarnings: jarEarnings,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(user),
    headers: headers,
  };
}

const getBtcPrice = async () => {
  return await getPrice("bitcoin");
};

const getEthPrice = async () => {
  return await getPrice("ethereum");
}

const getPrice = async (token) => {
  return await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`)
    .then(response => response.json())
    .then(json => json[token].usd);
};

const getUniswapPrice = async (token) => {
  const query = `
    {
      pair(id: "${token}") {
        reserveUSD
        totalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.UNISWAP, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
  const reserveUSD = queryResult.data.pair.reserveUSD;
  const liquidityPrice = (1 / queryResult.data.pair.totalSupply);
  return reserveUSD * liquidityPrice;
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
