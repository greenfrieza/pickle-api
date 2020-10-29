const AWS = require("aws-sdk");
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});
const { getChartData } = require("../util");

exports.handler = async (event) => {
  const asset = event.pathParameters.jarname;
  const count = event.queryStringParameters ? event.queryStringParameters.count : null;
  const points = await getChartData(process.env.ASSET_DATA, asset, count);

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
