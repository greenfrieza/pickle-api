const { jars } = require("../../jars");
const { UNI_PICKLE } = require("../constants");
const { getAssetData, getUniswapPair } = require("../util");

const formatFloat = (value) => parseFloat(parseFloat(value).toFixed(2));
exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const liquidity = await getUniswapPair(UNI_PICKLE);
  const assetValues = {
    liquidity: formatFloat(liquidity.data.pair.reserveUSD),
  };

  let updatedAt = 0;
  let jarValue = 0;
  for (const key of Object.keys(jars)) {
    const asset = jars[key].asset.toLowerCase();
    const assetData = await getAssetData(process.env.ASSET_DATA, asset, 1);
    const value = formatFloat(assetData[0].value);
    updatedAt = Math.max(updatedAt, assetData[0].timestamp);
    assetValues[asset] = value;
    jarValue += value;
  }
  assetValues.jarValue = jarValue;
  assetValues.totalValue = jarValue + assetValues.liquidity;
  assetValues.updatedAt = updatedAt;

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(assetValues),
  };
}
