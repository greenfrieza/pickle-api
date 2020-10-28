const AWS = require("aws-sdk");
const https = require("https");
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

const THIRTY_MIN_BLOCKS = 180;
const START_BLOCK = 10987327;
const STAKING_CONTRACT = "0xd86f33388bf0bfdf0ccb1ecb4a48a1579504dc0a";

exports.handler = async () => {
  let startBlock = START_BLOCK; // await getLastBlock();
  while (true) {
    let result = await queryStaking(startBlock);
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
    let timestamp = staking.timestamp;

    save(startBlock, (staked / totalSupply) * 100, timestamp);
    startBlock += THIRTY_MIN_BLOCKS;
  }
  return 200;
};

const queryStaking = async (block) => {
  let rewardQuery = `
    {
      rewardContract(id: "${STAKING_CONTRACT}", block: {number: ${block}}) {
        stakedTokens
        stakingTokenTotalSupply
        timestamp
      }
    }
  `;

  return await postQuery(rewardQuery);
};

const postQuery = (query) => {
  const options = {
    hostname: process.env.THE_GRAPH,
    path: process.env.PICKLE,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(body));
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(JSON.stringify({query}));
    req.end();
  });
};

const save = (block, balance, timestamp) => {
  let params = {
    TableName: "pickle_jar",
    Item: {
      asset: "pickle",
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

const getLastBlock = async () => {
  let params = {
    TableName : "jar",
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": "pickle"
    },
    ScanIndexForward: false,
    Limit: 1,
  };
  let result = await client.query(params).promise();
  return result.Items.length !== 0 ? result.Items[0].height : START_BLOCK;
};
