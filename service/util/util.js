const AWS = require("aws-sdk");
const Web3 = require("web3");
const fetch = require("node-fetch");
const { SCRV, THREE_CRV, DAI, UNI_DAI, UNI_USDC, UNI_USDT, UNI_WBTC, RENBTC, UNI_PICKLE, SUSHI_MIC, UNI_BAC, STECRV } = require("./constants");
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});
const web3 = new Web3(new Web3.providers.HttpProvider('https://cloudflare-eth.com/'));

module.exports.respond = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    ...body && { body: JSON.stringify(body) },
  };
};

module.exports.getBlock = async (blockNumber) => await web3.eth.getBlock(blockNumber);

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

module.exports.getIndexedBlock = async (table, asset, createdBlock) => {
  const params = {
    TableName: table,
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

module.exports.getJar = async (contract, block) => {
  let query = `
    {
      jar(id: "${contract}"${block ? `, block: {number: ${block}}`: ""}) {
        token {
          id
        }
        balance
        ratio
        totalSupply
      }
    }
  `;
  return await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
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
  return await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
};

module.exports.getUniswapPair = async (token, block) => {
  const query = `
    {
      pair(id: "${token}"${block ? `, block: {number: ${block}}`: ""}) {
        reserveUSD
        totalSupply
      }
    }
  `;
  return await fetch(process.env.UNISWAP, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
};

module.exports.getUniswapPrice = async (token) => {
  const uniswapPair = await this.getUniswapPair(token);
  const reserveUSD = uniswapPair.data.pair.reserveUSD;
  const liquidityPrice = (1 / uniswapPair.data.pair.totalSupply);
  return reserveUSD * liquidityPrice;
};

module.exports.getSushiswapPair = async (token, block) => {
  const query = `
    {
      pair(id: "${token}"${block ? `, block: {number: ${block}}`: ""}) {
        reserve0
        reserve1
        token0 {
          id
        }
        token1 {
          id
        }
        totalSupply
      }
    }
  `;
  return await fetch(process.env.SUSHISWAP, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
};

module.exports.getSushiswapPrice = async (token) => {
  const pair = (await this.getSushiswapPair(token)).data.pair;
  const token0Price = await this.getContractPrice(pair.token0.id);
  let token1Price = 0; // This is a nasty hack, value isn't indexed
  if (pair.token1.id === '0xc5bddf9843308380375a611c18b50fb9341f502a') {
    token1Price = await this.getTokenPrice('curve-dao-token');
  } else {
    token1Price = await this.getContractPrice(pair.token1.id);
  }
  return (token0Price * pair.reserve0 + token1Price * pair.reserve1) / pair.totalSupply;
};

module.exports.getUsdValue = async (asset, balance) => {
  let assetPrice = 0;
  switch (asset) {
    case SCRV:
    case THREE_CRV:
    case RENBTC:
    case DAI:
      assetPrice = await this.getContractPrice(asset);
      break;
    case UNI_DAI:
    case UNI_USDC:
    case UNI_USDT:
    case UNI_WBTC:
    case UNI_PICKLE:
    case UNI_BAC:
      assetPrice = await this.getUniswapPrice(asset);
      break;
    case STECRV:
      assetPrice = await this.getTokenPrice('ethereum');
      break;
    default:
      assetPrice = await this.getSushiswapPrice(asset);
      break;
  }
  return assetPrice * balance;
};
