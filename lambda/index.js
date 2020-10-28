const AWS = require('aws-sdk')
const https = require('https');
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

const THIRTY_MIN_BLOCKS = 180;
exports.handler =  async (event) => {
  await indexJar(event.type, event.asset, event.contract, event.startBlock);
  return 200;
};

async function indexJar(type, asset, contract, createdBlock) {
  let startBlock = await getLastBlock(asset, createdBlock);
  console.log('index', asset, 'from', startBlock);

  while (true) {
    let jarResult = await queryJar(contract, startBlock);
    if (jarResult.errors != undefined && jarResult.errors != null) {
      console.log('indexed up to ', startBlock);
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
};

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
};

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
  let reserveUSD = pairResult.data.pair.reserveUSD;
  let reserve0 = pairResult.data.pair.reserve0;
  return reserveUSD / (2 * reserve0);
};

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

    req.write(JSON.stringify({query}));
    req.end();
  });

  return queryRequest;
};

const save = (client, asset, block, balance, timestamp)  => {
  let params = {
    TableName: 'jar',
    Item: {
      asset: asset,
      height: block,
      balance: balance.toFixed(2),
      timestamp: timestamp,
    }
  };
  client.put(params, (err, data) => {
    if (err) {
      console.warn(err);
    }
  });
};

const getLastBlock = async (asset, createdBlock) => {
  let params = {
    TableName : "pickle_jar",
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": asset
    },
    ScanIndexForward: false,
    Limit: 1,
  };
  let result = await client.query(params).promise();
  return result.Items.length > 0 ? result.Items[0].height : createdBlock;
};
 