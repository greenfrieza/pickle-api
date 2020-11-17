const { jars } = require("../../jars");
const { getAssetData, getMasterChef, getUsdValue, getJar, getContractPrice, respond } = require("../../util/util");
const { PICKLE } = require("../../util/constants");
const { getFarmData } = require("../farm/handler");

// data point constants - index twice per hour, 48 per day
const CURRENT = 0;
const ONE_DAY = 24 * 60 / 10; // data points indexed at 10 minute intervals
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;
const SAMPLE_DAYS = THIRTY_DAYS + 1;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  try {
    const asset = event.pathParameters.jarname;
    console.log("Request performance data for", asset);

    const data = await getAssetData(process.env.ASSET_DATA, asset, SAMPLE_DAYS);
    const farmPerformance = await getFarmPerformance(asset);
    const farmApy = farmPerformance ? farmPerformance : 0;
    const threeDay = getSamplePerformance(data, THREE_DAYS);
    const sevenDay = getSamplePerformance(data, SEVEN_DAYS);
    const thirtyDay = getSamplePerformance(data, THIRTY_DAYS);
    const jarPerformance = {
      threeDay: format(threeDay),
      sevenDay: format(sevenDay),
      thirtyDay: format(thirtyDay),
      threeDayFarm: format(threeDay + farmApy),
      sevenDayFarm: format(sevenDay + farmApy),
      thirtyDayFarm: format(thirtyDay + farmApy),
    };

    return respond(200, jarPerformance);
  } catch (err) {
    console.log(err);
    return respond(500, {
      statusCode: 500,
      message: "Unable to retreive jar performance"
    });
  }
}

// helper functions
const format = (value) => value ? parseFloat(value.toFixed(2)) : undefined;
const getRatio = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].ratio : undefined;
const getBlock = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].height : undefined;
const getTimestamp = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].timestamp : undefined;

const getPerformance = (ratioDiff, blockDiff, timeDiff) => {
  console.log(ratioDiff, blockDiff, timeDiff);
  const scalar = (ONE_YEAR_MS / timeDiff) * blockDiff;
  const slope = ratioDiff / blockDiff;
  return scalar * slope * 100;
};

const getSamplePerformance = (data, offset) => {
  // get current values
  const currentRatio = getRatio(data, CURRENT);
  const currentBlock = getBlock(data, CURRENT);
  const currentTimestamp = getTimestamp(data, CURRENT);

  // get sampled ratios
  const sampledRatio = getRatio(data, offset);
  const sampledBlock = getBlock(data, offset);
  const sampledTimestamp = getTimestamp(data, offset);

  if (!sampledRatio || !sampledBlock || !sampledTimestamp) {
    return undefined;
  }

  const ratioDiff = currentRatio - sampledRatio;
  const blockDiff = currentBlock - sampledBlock;
  const timestampDiff = currentTimestamp - sampledTimestamp;
  return getPerformance(ratioDiff, blockDiff, timestampDiff);
};

const getFarmPerformance = async (asset) => {
  const performanceData = await getFarmData();
  const farmData = performanceData[asset];
  if (!farmData) {
    return farmData;
  }
  return farmData.apy * 100;
};

const getCurvePerformance = async (asset) => {

};

const getUniswapPerformance = async (asset) => {

};
