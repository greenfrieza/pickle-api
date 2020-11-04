const AWS = require("aws-sdk");
const { getAssetData } = require("../../../util");

// data point constants
const CURRENT = 0;
const ONE_DAY = 48;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;

// helper functions
const getRatio = (data, offset) => data.length > offset ? data[data.length - (offset + 1)].ratio : undefined;
const getBlock = (data, offset) => data.length > offset ? data[data.length - (offset + 1)].height : undefined;
const getPerformance = (cRatio, pRatio, cBlock, pBlock, days) => {
  if (pRatio) {
    const blocks = cBlock - pBlock;
    const scalar = (365 / days) * blocks;
    const slope = (cRatio - pRatio) / blocks;
    return scalar * slope * 100;
  }
  return undefined;
};

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const asset = event.pathParameters.jarname;
  let data = await getAssetData(process.env.ASSET_DATA, asset);

  if (asset === "cdai") {
    const initialRatio = data[0].ratio;
    const diffRatio = initialRatio - 1;
    data = data.map(d => {
      d.ratio -= diffRatio;
      return d;
    });
  }

  const points = data.map(item => ({x: item.timestamp, y: parseFloat(item.ratio)}));

  // get ratios
  const currentRatio = getRatio(data, CURRENT);
  const threeDayRatio = getRatio(data, THREE_DAYS);
  const sevenDayRatio = getRatio(data, SEVEN_DAYS);
  const thirtyDayRatio = getRatio(data, THIRTY_DAYS);

  // get blocks
  const currentBlock = getBlock(data, CURRENT);
  const threeDayBlock = getBlock(data, THREE_DAYS);
  const sevenDayBlock = getBlock(data, SEVEN_DAYS);
  const thirtyDayBlock = getBlock(data, THIRTY_DAYS);

  const performanceData = {
    data: points,
    threeDay: getPerformance(currentRatio, threeDayRatio, currentBlock, threeDayBlock, 3),
    sevenDay: getPerformance(currentRatio, sevenDayRatio, currentBlock, sevenDayBlock, 7),
    thirtyDay: getPerformance(currentRatio, thirtyDayRatio, currentBlock, thirtyDayBlock, 30),
  };
  console.log(performanceData);

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(performanceData),
  };
}
