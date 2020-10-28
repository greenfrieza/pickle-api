const AWS = require('aws-sdk')
const https = require('https');
const { start } = require('repl');

const THIRTY_MIN_BLOCKS = 180;
const jars = {
  // daiv1: {
  //   contract: '0xf79ae82dccb71ca3042485c85588a3e0c395d55b', 
  //   startBlock: 10882533,
  //   stopBlock: 10960250,
  //   asset: 'dai/eth',
  //   type: 'uni'
  // },
  // usdcv1: {
  //   contract: '0x46206e9bdaf534d057be5ecf231dad2a1479258b', 
  //   startBlock: 10883082,
  //   stopBlock: 10959402,
  //   asset: 'usdc/eth',
  //   type: 'uni'
  // },
  // usdtv1: {
  //   contract: '0x3a41ab1e362169974132dea424fb8079fd0e94d8', 
  //   startBlock: 10882948,
  //   stopBlock: 10959200,
  //   asset: 'usdt/eth',
  //   type: 'uni'
  // },
  scrvv1: {
    contract: '0x2385d31f1eb3736be0c3629e6f03c4b3cd997ffd',
    startBlock: 10863877,
    stopBlock: 10958737,
    asset: 'scrv',
    type: 'compound'
  },
}

exports.handler =  async (event) => {
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
    let timestamp = jar.timestamp;
    let jarSupply = jar.totalSupply / Math.pow(10, 18);
    let jarBalance = jar.balance / Math.pow(10, 18);

    let balance;
    if (type == 'uni') {
      balance = await getUniBalance(jar.token.id, startBlock, jarSupply);
    } else if (type == 'compound') {
      balance = jarBalance;
    } else if (type == 'btc') {
      let btcPrice = await getBtcPrice(startBlock);
      balance = jarBalance * btcPrice;
    }

    save(client, asset, startBlock, balance, timestamp);
    startBlock += THIRTY_MIN_BLOCKS;
  }
}

const queryJar = async (contract, block) => {
  let jarQuery = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        token {
          id
        }
        balance
        totalSupply
        timestamp
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

const save = (client, asset, block, balance, timestamp) => {
  let params = {
    TableName: 'pickle_jar',
    Item: {
      asset: asset,
      height: block,
      balance: balance.toFixed(2),
      timestamp: timestamp,
    }
  }
  client.put(params, (err, data) => {
    if (err) {
      console.warn(err);
    }
  });
}
