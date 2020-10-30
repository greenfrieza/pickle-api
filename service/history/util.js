const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

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
