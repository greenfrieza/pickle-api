const AWS = require('aws-sdk')

exports.handler = (event, context, callback) => {
  console.log(event);
  let request = JSON.parse(event.body);
  let client = new AWS.DynamoDB.DocumentClient();
  let params = {
    TableName : "jar",
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": request.asset
    }
  };

  console.log('request historical data for', request.asset);
  client.query(params, (err, data) => {
    if (err) {
      console.warn(err);
      callback(err, null);
    } else {
      let points = data.Items.map(item => ({
        name: 'Value',
        x: item.height,
        y: item.balance,
      }));
      callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(points)
      });
    }
  });
}
