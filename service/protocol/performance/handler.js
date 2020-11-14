const { getAssetData } = require("../../util");

// data point constants - index twice per hour, 48 per day
const CURRENT = 0;
const ONE_DAY = 48;
const THREE_DAYS = ONE_DAY * 3;
const SEVEN_DAYS = ONE_DAY * 7;
const THIRTY_DAYS = ONE_DAY * 30;
const SAMPLE_DAYS = THIRTY_DAYS + 1;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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


exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const asset = event.pathParameters.jarname;
  const data = await getAssetData(process.env.ASSET_DATA, asset, SAMPLE_DAYS);
  const performanceData = {
    threeDay: getSamplePerformance(data, THREE_DAYS),
    sevenDay: getSamplePerformance(data, SEVEN_DAYS),
    thirtyDay: getSamplePerformance(data, THIRTY_DAYS),
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
