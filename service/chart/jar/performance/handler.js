const { getAssetData } = require("../../../util");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const asset = event.pathParameters.jarname;
  let data = await getAssetData(process.env.ASSET_DATA, asset);

  if (asset === "cdai") {
    const diffRatio = data[0].ratio - 1;
    data = data.map(d => {
      d.ratio -= diffRatio;
      return d;
    });
  }

  const points = data.map(item => ({x: item.timestamp, y: parseFloat(item.ratio)}));
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
