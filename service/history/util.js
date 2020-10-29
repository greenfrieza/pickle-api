const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

module.exports.getChartData = async (table, asset, count) => {
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
    };
  }

  const history = await client.query(params).promise();
  return history.Items.map(item => ({x: item.timestamp, y: parseFloat(item.balance)}));
};
