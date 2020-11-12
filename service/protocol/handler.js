const { jars } = require("../../jars");
const { getAssetData } = require("../util");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  let totalValue = 0;
  let jarValues = {};
  for (const key of Object.keys(jars)) {
    const asset = jars[key].asset.toLowerCase();
    const assetData = await getAssetData(process.env.ASSET_DATA, asset, 1);
    const value = parseFloat(parseFloat(assetData[0].value).toFixed(2));
    jarValues[asset] = value;
    totalValue += value;
  }
  jarValues.totalValue = totalValue;

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(jarValues),
  };
}