const AWS = require("aws-sdk");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/701c49f0f48a42aa8672668ea874ba0f"));
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

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
