const { getTokenPrice } = require("../../util/util");
const { indexAsset } = require("../indexer");

exports.handler = async (event) => {
  const getPrice = async (jarData) => await getTokenPrice('ethereum');
  return await indexAsset(event, getPrice);
};
