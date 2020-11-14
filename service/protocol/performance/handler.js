const { getAssetData } = require("../../util");

// data point constants - index twice per hour, 48 per day
const CURRENT = 0;
const ONE_DAY = 48;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// helper functions
const getRatio = (data, offset) => data.length > offset ? data[data.length - (offset + 1)].ratio : undefined;
const getTimestamp = (data, offset) => data.length > offset ? data[data.length - (offset + 1)].timestamp : undefined;
const getPerformance = (cRatio, pRatio, cTime, pTime) => {
  if (pRatio) {
    const timeDiff = cTime - pTime;
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
  const data = await getAssetData(process.env.ASSET_DATA, asset, THIRTY_DAYS);

  // get ratios
  const currentRatio = getRatio(data, CURRENT);
  const threeDayRatio = getRatio(data, THREE_DAYS);
  const sevenDayRatio = getRatio(data, SEVEN_DAYS);
  const thirtyDayRatio = getRatio(data, THIRTY_DAYS);

  // get blocks
  const currentBlock = getTimestamp(data, CURRENT);
  const threeDayBlock = getTimestamp(data, THREE_DAYS);
  const sevenDayBlock = getTimestamp(data, SEVEN_DAYS);
  const thirtyDayBlock = getTimestamp(data, THIRTY_DAYS);

  const performanceData = {
    threeDay: getPerformance(currentRatio, threeDayRatio, currentBlock, threeDayBlock),
    sevenDay: getPerformance(currentRatio, sevenDayRatio, currentBlock, sevenDayBlock),
    thirtyDay: getPerformance(currentRatio, thirtyDayRatio, currentBlock, thirtyDayBlock),
  };

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
