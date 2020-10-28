const AWS = require("aws-sdk");
const client = new AWS.DynamoDB.DocumentClient({apiVersion: "2012-08-10"});

exports.handler = (event, context, callback) => {
  let asset = event.pathParameters.jarname;
  let params = {
    TableName : "pickle_jar",
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": asset
    },
  };

  let count = event.queryStringParameters ? event.queryStringParameters.count : null;
  // add a limit request
  if (count) {
    params = { 
      ...params,
      Limit: count,
    };
  }

  client.query(params, (err, data) => {
    if (err) {
      console.warn(err);
      callback(err, null);
    } else {
      let points = data.Items.map(item => ({
        x: new Date(item.timestamp * 1000),
        y: parseFloat(item.balance),
      }));
      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,GET",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify(points)
      });
    }
  });
}
