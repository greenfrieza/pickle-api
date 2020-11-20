const { getAssetData, respond } = require("../../util/util");
const { getFarmData } = require("../farm/handler");
const { UNI_PICKLE } = require("../../util/constants");
const { jars } = require("../../jars");
const fetch = require("node-fetch");

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

    const isAsset = asset !== "pickle-eth";
    const performanceInfo = await Promise.all([
      getProtocolPerformance(asset, ONE_DAY),
      getProtocolPerformance(asset, SEVEN_DAYS),
      getProtocolPerformance(asset, THIRTY_DAYS),
      getFarmPerformance(asset),
      ...isAsset ? [getAssetData(process.env.ASSET_DATA, asset, SAMPLE_DAYS)] : [],
    ]);

    const oneDayProtocol = performanceInfo[0];
    const sevenDayProtocol = performanceInfo[1];
    const thirtyDayProtocol = performanceInfo[2];
    const farmPerformance = performanceInfo[3];
    const data = performanceInfo[4];
    const farmApy = farmPerformance ? farmPerformance : 0;
    const oneDay = isAsset ? getSamplePerformance(data, ONE_DAY) : 0 + oneDayProtocol;
    const threeDay = isAsset ? getSamplePerformance(data, THREE_DAYS) : 0 + oneDayProtocol;
    const sevenDay = isAsset ? getSamplePerformance(data, SEVEN_DAYS) : 0 + sevenDayProtocol;
    const thirtyDay = isAsset ? getSamplePerformance(data, THIRTY_DAYS) : 0 + thirtyDayProtocol;
    const jarPerformance = {
      oneDay: format(oneDay),
      threeDay: format(threeDay),
      sevenDay: format(sevenDay),
      thirtyDay: format(thirtyDay),
      oneDayFarm: format(oneDay + farmApy),
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

// TODO: handle 3 / 7 / 30 days, handle liqduidity edge case more gracefully
const getProtocolPerformance = async (asset, days) => {
  const jarKey = Object.keys(jars).find(jar => jars[jar].asset.toLowerCase() === asset);
  const switchKey = jars[jarKey] ? jars[jarKey].protocol : "uniswap"; // pickle-eth
  switch (switchKey) {
    case "curve":
      return await getCurvePerformance(asset, days);
    case "uniswap":
      return await getUniswapPerformance(jars[jarKey] ? jars[jarKey].token : UNI_PICKLE, days);
    default:
      return 0;
  }
};

const curveApi = "https://www.curve.fi/raw-stats/apys.json";
const apyMapping = {
  "3poolcrv": "3pool",
  "renbtccrv": "ren2",
  "scrv": "susd",
}
const getCurvePerformance = async (asset, days) => {
  const curveData = await fetch(curveApi)
    .then(response => response.json());
  switch (days) {
    case ONE_DAY:
    case THREE_DAYS:
      return curveData.apy.day[apyMapping[asset]] * 100;
    case SEVEN_DAYS:
      return curveData.apy.week[apyMapping[asset]] * 100;
    default:
      return curveData.apy.month[apyMapping[asset]] * 100;
  }
};

const getUniswapPerformance = async (asset, days) => {
  const query = `
    {
      pairDayDatas(first: 30, orderBy: date, orderDirection: desc, where:{pairAddress: "${asset}"}) {
        reserveUSD
        dailyVolumeUSD
      }
    }
  `;
  const pairDayResponse = await fetch(process.env.UNISWAP, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json())
  .then(pairInfo => pairInfo.data.pairDayDatas);

  let sampleDays;
  switch (days) {
    case ONE_DAY:
    case THREE_DAYS:
      sampleDays = 1;
      break;
    case SEVEN_DAYS:
      sampleDays = 7;
      break;
    default:
      sampleDays = 30;
  }

  let totalApy = 0;
  for (let i = 0; i < sampleDays; i++) {
    let fees = pairDayResponse[i].dailyVolumeUSD * 0.003;
    totalApy += fees / pairDayResponse[i].reserveUSD * 365 * 100;
  }

  return totalApy / sampleDays;
};
