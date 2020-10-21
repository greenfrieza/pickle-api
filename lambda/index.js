const AWS = require('aws-sdk')
const https = require('https');
const { start } = require('repl');

const THIRTY_MIN_BLOCKS = 180;
const jars = {
  daiv1: {
    contract: '0xf79ae82dccb71ca3042485c85588a3e0c395d55b', 
    startBlock: 10882533,
    stopBlock: 10960250,
    asset: 'dai/eth',
    type: 'uni'
  },
  usdcv1: {
    contract: '0x46206e9bdaf534d057be5ecf231dad2a1479258b', 
    startBlock: 10883082,
    stopBlock: 10959402,
    asset: 'usdc/eth',
    type: 'uni'
  },
  usdtv1: {
    contract: '0x3a41ab1e362169974132dea424fb8079fd0e94d8', 
    startBlock: 10882948,
    stopBlock: 10959200,
    asset: 'usdt/eth',
    type: 'uni'
  },
  wbtc: {
    contract: '0xc80090aa05374d336875907372ee4ee636cbc562', 
    startBlock: 11010902,
    asset: 'wbtc/eth',
    type: 'uni'
  },
  dai: {
    contract: '0xcffa068f1e44d98d3753966ebd58d4cfe3bb5162', 
    startBlock: 10960588,
    asset: 'dai/eth',
    type: 'uni'
  },
  usdc: {
    contract: '0x53bf2e62fa20e2b4522f05de3597890ec1b352c6', 
    startBlock: 10960599,
    asset: 'usdc/eth',
    type: 'uni'
  },
  usdt: {
    contract: '0x09fc573c502037b149ba87782acc81cf093ec6ef',
    startBlock: 10960612,
    asset: 'usdt/eth',
    type: 'uni'
  },
  cdai: {
    contract: '0x6949bb624e8e8a90f87cd2058139fcd77d2f3f87',
    startBlock: 11044218,
    asset: 'cdai',
    type: 'compound'
  },
  p3crv: {
    contract: '0x1bb74b5ddc1f4fc91d6f9e7906cf68bc93538e33',
    startBlock: 11010885,
    asset: '3poolcrv',
    type: 'compound'
  },
  scrvv1: {
    contract: '0x2385d31f1eb3736be0c3629e6f03c4b3cd997ffd',
    startBlock: 10863877,
    stopBlock: 10960000,
    asset: 'scrv',
    type: 'compound'
  },
  scrvv2: {
    contract: '0x68d14d66b2b0d6e157c06dc8fefa3d8ba0e66a89',
    startBlock: 10973000,
    asset: 'scrv',
    type: 'compound'
  },
  renbtccrvv1: {
    contract: '0x2e35392f4c36eba7ecafe4de34199b2373af22ec',
    startBlock: 11010898,
    asset: 'renbtccrv',
    type: 'btc'
  }
}

exports.handler =  async (event) => {
  // let request = JSON.parse(event.body);
  // await indexJar(request.asset, request.contract, request.startBlock);
  for (const [key, value] of Object.entries(jars)) {
    await indexJar(value.type, value.asset, value.contract, value.startBlock, value.stopBlock);
  }
  return 200;
}

async function indexJar(type, asset, contract, startBlock, stopBlock) {
  console.log('index', asset, 'from', startBlock);
  var client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

  while (true && (stopBlock == undefined || startBlock < stopBlock)) {
    let jarResult = await queryJar(contract, startBlock);
    if (jarResult.errors != undefined && jarResult.errors != null) {
      break;
    }
    if (jarResult.data == null || jarResult.data.jar == null) {
      startBlock += THIRTY_MIN_BLOCKS;
      continue;
    }
    let jar = jarResult.data.jar;
    let jarSupply = jar.totalSupply / Math.pow(10, 18);
    let jarBalance = jar.balance / Math.pow(10, 18);

    let balance;
    if (type == 'uni') {
      balance = await getUniBalance(jar.token, startBlock, jarSupply);
    } else if (type == 'compound') {
      balance = jarBalance;
    } else if (type == 'btc') {
      let btcPrice = await getBtcPrice(startBlock);
      balance = jarBalance * btcPrice;
    }

    save(client, asset, startBlock, balance);
    startBlock += THIRTY_MIN_BLOCKS;
  }
}

const queryJar = async (contract, block) => {
  let jarQuery = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        token
        balance
        totalSupply
      }
    }
  `;

  return await postQuery(process.env.PICKLE, jarQuery);
}

const getUniBalance = async (token, block, jarSupply) => {
  let pairQuery = `
    {
      pair(id: "${token}", block: {number: ${block}}) {
        reserveUSD
        totalSupply
      }
    }
  `;

  let pairResult = await postQuery(process.env.UNISWAP, pairQuery);
  let reserveUSD = pairResult.data.pair.reserveUSD;
  let pairSupply = pairResult.data.pair.totalSupply;
  return reserveUSD * (jarSupply / pairSupply);
}

const getBtcPrice = async (block) => {
  let pairQuery = `
    {
      pair(id: "0xbb2b8038a1640196fbe3e38816f3e67cba72d940", block: {number: ${block}}) {
        reserveUSD
        reserve0
      }
    }
  `;

  let pairResult = await postQuery(process.env.UNISWAP, pairQuery);
  console.log(pairResult);
  let reserveUSD = pairResult.data.pair.reserveUSD;
  let reserve0 = pairResult.data.pair.reserve0;
  return reserveUSD / (2 * reserve0);
}

const postQuery = (subgraph, query) => {
  const options = {
    hostname: process.env.THE_GRAPH,
    path: subgraph,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  let queryRequest = new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify({query}))
    req.end();
  });

  return queryRequest;
}

const save = (client, asset, block, balance) => {
  let params = {
    TableName: 'jar',
    Item: {
      asset: asset,
      height: block,
      balance: balance.toFixed(2)
    }
  }
  client.put(params, (err, data) => {
    if (err) {
      console.warn(err);
    }
  });
}
