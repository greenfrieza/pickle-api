const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});
const { getBlock } = require("../../util");

const THIRTY_MIN_BLOCKS = 180;

exports.handler =  async (event) => {
  await indexJar(event.asset, event.contract, event.createdBlock);
  return 200;
};

const indexJar = async (asset, contract, createdBlock) => {
  let currentBlock = createdBlock; // await getLastBlock(asset, createdBlock);

  while (true) {
    console.log('index block', currentBlock);
    const jarResult = await queryJar(contract, currentBlock);
    if (jarResult.errors != undefined && jarResult.errors != null) {
      break;
    }
    if (jarResult.data == null || jarResult.data.jar == null) {
      currentBlock += THIRTY_MIN_BLOCKS;
      continue;
    }
    const jar = jarResult.data.jar;
    const blockData = await getBlock(currentBlock);
    console.log(new Date(blockData.timestamp * 1000));
    let timestamp = blockData.timestamp;
    let balance = jar.balance / Math.pow(10, 18);
    save(asset, currentBlock, balance, timestamp);
    currentBlock += THIRTY_MIN_BLOCKS;
    break;
  }
};

const queryJar = async (contract, block) => {
  let query = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        balance
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};

const save = (asset, block, balance, timestamp) => {
  let params = {
    TableName: "brining",
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
    TableName : "brining",
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
