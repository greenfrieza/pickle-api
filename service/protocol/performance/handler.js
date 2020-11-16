const { jars } = require("../../jars");
const { getAssetData, getMasterChef, getUsdValue, getJar, getContractPrice, respond } = require("../../util/util");
const { PICKLE } = require("../../util/constants");
const { getFarmData } = require("../farm/handler");

// data point constants - index twice per hour, 48 per day
const CURRENT = 0;
const ONE_DAY = 48;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;
const SAMPLE_DAYS = THIRTY_DAYS + 1;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const asset = event.pathParameters.jarname;
  console.log("Request performance data for", asset);
  const data = await getAssetData(process.env.ASSET_DATA, asset, SAMPLE_DAYS);
  const farmPerformance = await getFarmPerformance(asset);
  const farmApy = farmPerformance ? farmPerformance : 0;
  const threeDay = getSamplePerformance(data, THREE_DAYS);
  const sevenDay = getSamplePerformance(data, SEVEN_DAYS);
  const thirtyDay = getSamplePerformance(data, THIRTY_DAYS);
  const jarPerformance = {
    threeDay: threeDay,
    sevenDay: sevenDay,
    thirtyDay: thirtyDay,
    threeDayFarm: threeDay + farmApy,
    sevenDayFarm: sevenDay + farmApy,
    thirtyDayFarm: thirtyDay + farmApy,
  };

  return respond(200, jarPerformance);
}

// helper functions
const getRatio = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].ratio : undefined;
const getBlock = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].height : undefined;
const getTimestamp = (data, offset) => data.length >= offset ? data[data.length - (offset + 1)].timestamp : undefined;

const getPerformance = (ratioDiff, blockDiff, timeDiff) => {
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
  const assetId = Object.keys(jars).find(key => jars[key].asset.toLowerCase() === asset);

  // parallelize calls
  const performanceData = await Promise.all([
    getFarmData(),
    getJar(assetId)
  ]);

  // collect performance data
  const farmData = performanceData[0][assetId];
  const jar = performanceData[2].data.jar;
  const yearlyEmission = farmData.valuePerDay * 365;

  // calculate pickle apy
  const balance = farmInfo.balance / Math.pow(10, 18);
  const ratio = jar.ratio / Math.pow(10, 18);
  const poolValue = await getUsdValue(jars[assetId].token, balance) * ratio;

  return (yearlyEmission / poolValue) * 100;
};
