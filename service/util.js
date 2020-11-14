const AWS = require("aws-sdk");
const Web3 = require("web3");
const fetch = require("node-fetch");
const { WETH, SCRV, TCRV, DAI, UNI_DAI, UNI_USDC, UNI_USDT, UNI_WBTC, RENBTC } = require("./constants");
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});
const web3 = new Web3(new Web3.providers.HttpProvider(`https://:${process.env.INFURA_PROJECT_SECRET}@mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`));

module.exports.getBlock = async (blockNumber) => await web3.eth.getBlock(blockNumber);

module.exports.getIndexedBlock = async (table, asset, createdBlock) => {
  const params = {
    TableName : table,
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": asset
    },
    ScanIndexForward: false,
    Limit: 1,
  };
  let result = await ddb.query(params).promise();
  return result.Items.length > 0 ? result.Items[0].height : createdBlock;
};

module.exports.saveItem = async (table, item) => {
  let params = {
    TableName: table,
    Item: item
  };
  return await ddb.put(params).promise();
};

module.exports.getAssetData = async (table, asset, count) => {
  let params = {
    TableName : table,
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": asset
    },
  };

  if (count) {
    params = { 
      ...params,
      Limit: count,
      ScanIndexForward: false,
    };
  }

  const data = await ddb.query(params).promise();
  return count ? data.Items.reverse() : data.Items;
};

module.exports.getContractPrice = async (contract) => {
  return await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${contract}&vs_currencies=usd`)
  .then(response => response.json())
  .then(json => json[contract].usd);
};

module.exports.getTokenPrice = async (token) => {
  return await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`)
    .then(response => response.json())
    .then(json => json[token].usd);
};

module.exports.getJar = async (contract) => {
  let query = `
    {
      jar(id: "${contract}") {
        balance
        ratio
        totalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};

module.exports.getMasterChef = async () => {
  let query = `
    {
      masterChef(id: "0xbd17b1ce622d73bd438b9e658aca5996dc394b0d") {
        id
        totalAllocPoint
        rewardsPerBlock
      },
      masterChefPools(where: {allocPoint_gt: 0}, orderBy: allocPoint, orderDirection: desc) {
        id
        token {
          id
        }
        balance
        allocPoint
        lastRewardBlock
        accPicklePerShare
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};

module.exports.getUniswapPrice = async (token) => {
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

module.exports.getUsdValue = async (asset, balance) => {
  let assetPrice = 0;
  switch (asset) {
    case SCRV:
      assetPrice = await this.getContractPrice(SCRV);
      break;
    case TCRV:
      assetPrice = await this.getContractPrice(TCRV);
      break;
    case RENBTC:
      assetPrice = await this.getContractPrice(RENBTC);
      break;
    case DAI:
      assetPrice = await this.getContractPrice(DAI);
      break;
    case UNI_DAI:
      assetPrice = await this.getUniswapPrice(UNI_DAI);
      break;
    case UNI_USDC:
      assetPrice = await this.getUniswapPrice(UNI_USDC);
      break;
    case UNI_USDT:
      assetPrice = await this.getUniswapPrice(UNI_USDT);
      break;
    case UNI_WBTC:
      assetPrice = await this.getUniswapPrice(UNI_WBTC);
      break;
    default:
      break;
  }
  return assetPrice * balance;
};