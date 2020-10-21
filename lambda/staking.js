const AWS = require('aws-sdk')
const https = require('https');

const THIRTY_MIN_BLOCKS = 180;
const jars = {
  pickle: {
    contract: '0xd86f33388bf0bfdf0ccb1ecb4a48a1579504dc0a', 
    startBlock: 10987327,
    asset: 'pickle'
  }
}

exports.handler =  async (event) => {
  // let request = JSON.parse(event.body);
  // await indexJar(request.asset, request.contract, request.startBlock);
  for (const [key, value] of Object.entries(jars)) {
    await indexStaking(value.asset, value.contract, value.startBlock);
  }
  return 200;
}

async function indexStaking(asset, contract, startBlock, stopBlock) {
  console.log('index', asset, 'from', startBlock);
  var client = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

  while (true) {
    let result = await queryStaking(contract, startBlock);
    console.log(result);
    if (result.errors != undefined && result.errors != null) {
      break;
    }
    if (result.data == null || result.data.rewardContract == null) {
      startBlock += THIRTY_MIN_BLOCKS;
      continue;
    }
    let staking = result.data.rewardContract;
    let staked = staking.stakedTokens / Math.pow(10, 18);
    let totalSupply = staking.stakingTokenTotalSupply / Math.pow(10, 18);

    save(client, asset, startBlock, (staked / totalSupply) * 100);
    startBlock += THIRTY_MIN_BLOCKS;
  }
}

const queryStaking = async (contract, block) => {
  let rewardQuery = `
    {
      rewardContract(id: "${contract}", block: {number: ${block}}) {
        stakedTokens
        stakingTokenTotalSupply
      }
    }
  `;

  return await postQuery(process.env.PICKLE, rewardQuery);
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
      balance: balance.toFixed(0)
    }
  }
  client.put(params, (err, data) => {
    if (err) {
      console.warn(err);
    }
  });
}
