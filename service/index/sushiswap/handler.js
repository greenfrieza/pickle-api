const { getSushiswapPrice } = require("../../util/util");
const { indexAsset } = require("../indexer");

exports.handler = async (event) => {
  const getPrice = async (jarData) => await getSushiswapPrice(jarData.token.id);
  return await indexAsset(event, getPrice);
};
