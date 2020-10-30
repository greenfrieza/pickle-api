const AWS = require("aws-sdk");
const { getAssetData } = require("../util");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }
  
  const asset = event.pathParameters.token;
  const count = event.queryStringParameters ? event.queryStringParameters.count : null;
  const data = await getAssetData(process.env.REWARDS_DATA, asset, count);
  const points = data.map(item => ({x: item.timestamp, y: parseFloat(item.staked)}));

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(points),
  };
}
