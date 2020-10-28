const AWS = require('aws-sdk')
const https = require('https');
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

const THIRTY_MIN_BLOCKS = 180;

exports.handler =  async (event) => {
  await indexJar(event.asset, event.contract, event.createdBlock);
  return 200;
};

const indexJar = async (asset, contract, createdBlock) => {
  let startBlock = await getLastBlock(asset, createdBlock);
  console.log('index', asset, 'from', startBlock);

  while (true) {
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
    let balance = jar.balance / Math.pow(10, 18);
    save(asset, startBlock, balance, timestamp);
    startBlock += THIRTY_MIN_BLOCKS;
  }
};

const queryJar = async (contract, block) => {
  let jarQuery = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        balance
        timestamp
      }
    }
  `;
  return await postQuery(process.env.PICKLE, jarQuery);
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

const save = (asset, block, balance, timestamp) => {
  let params = {
    TableName: 'pickle_jar',
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
