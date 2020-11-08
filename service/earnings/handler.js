const fetch = require("node-fetch");
const { jars } = require("../../jars");
const { getTokenPrice, getContractPrice } = require("../util");

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
  console.log("Retrieving earnings for", userId);
  const userData = await getUserData(userId);
  
  if (userData.data == null || userData.data.user == null) {
    return {
      statusCode: 404,
      headers: headers,
    }
  }

  const data = userData.data.user;
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
    } else if (data.jar.symbol == "crvPlain3andSUSD") {
      earnedUsd = earned * await getScrvPrice();
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

  const wethRewards = data.wethRewards / Math.pow(10, 18);
  const wethEarningsUsd = wethRewards * await getEthPrice();
  const wethEarnings = {
    asset: "WETH",
    earned: wethRewards,
    earnedUsd: wethEarningsUsd,
  };
  console.log(wethEarnings);
  jarEarnings.push(wethEarnings);

  let jarEarningsUsd = 0;
  if (jarEarnings && jarEarnings.length > 0) {
    jarEarningsUsd = jarEarnings.map(jar => jar.earnedUsd).reduce((total, earnedUsd) => total + earnedUsd);
  }

  const user = {
    userId: userId,
    earnings: jarEarningsUsd,
    jarEarnings: jarEarnings.filter(jar => jar.earnedUsd > 0),
  };
  console.log(user);

  return {
    statusCode: 200,
    body: JSON.stringify(user),
    headers: headers,
  };
}

const getBtcPrice = async () => {
  return await getTokenPrice("bitcoin");
};

const getEthPrice = async () => {
  return await getTokenPrice("ethereum");
}

const getScrvPrice = async () => {
  return await getContractPrice("0xc25a3a3b969415c80451098fa907ec722572917f");
}

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
