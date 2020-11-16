const { jars } = require("../../jars");
const { getAssetData, getMasterChef, getUsdValue, getJar, getContractPrice } = require("../../util/util");
const { PICKLE } = require("../../util/constants");

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

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(jarPerformance),
  };
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
    getContractPrice(PICKLE),
    getMasterChef(),
    getJar(assetId)
  ]);

  // collect performance data
  const picklePrice = performanceData[0];
  const masterChefData = performanceData[1].data;
  const jar = performanceData[2].data.jar;
  const masterChef = masterChefData.masterChef;

  // match farm, fail fast on non-active farms
  const farmInfo = masterChefData.masterChefPools.find(pool => pool.token.id === assetId);
  if (!farmInfo) {
    return farmInfo;
  }

  // collect farm data
  const farmAlloc = farmInfo.allocPoint / masterChef.totalAllocPoint;
  const rewards = masterChef.rewardsPerBlock / Math.pow(10, 18);
  const pickleEmission = picklePrice * farmAlloc * rewards;
  const yearlyEmission = pickleEmission * 276 * 24 * 365;

  // calculate pickle apy
  const balance = farmInfo.balance / Math.pow(10, 18);
  const ratio = jar.ratio / Math.pow(10, 18);
  const poolValue = await getUsdValue(jars[assetId].token, balance) * ratio;

  return (yearlyEmission / poolValue) * 100;
};
