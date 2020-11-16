const { getMasterChef } = require("../../util/masterChef");
const { respond, getContractPrice } = require("../../util/util");
const { jars } = require("../../jars");
const { PICKLE } = require("../../util/constants");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const picklePrice = await getContractPrice(PICKLE);
  const masterChefData = await getMasterChef();
  const masterChef = masterChefData.data.masterChef;
  const masterChefPools = masterChefData.data.masterChefPools;
  const farms = {
    picklePerBlock: masterChef.rewardsPerBlock / 1e18,
  };
  
  masterChefPools.forEach(pool => {
    const allocShare = pool.allocPoint / masterChef.totalAllocPoint;
    const jarKey = Object.keys(jars).find(key => key === pool.token.id);
    const farmName = jarKey ? jars[jarKey].asset.toLowerCase() : "pickle-eth"; // only non-jar farm

    const picklePerBlock = allocShare * farms.picklePerBlock;
    const valuePerBlock = picklePerBlock * picklePrice;
    farms[farmName] = {
      allocShare: allocShare,
      picklePerBlock: format(picklePerBlock),
      valuePerBlock: format(valuePerBlock),
      picklePerHour: format(toHour(picklePerBlock)),
      valuePerHour: format(toHour(valuePerBlock)),
      picklePerDay: format(toDay(picklePerBlock)),
      valuePerDay: format(toDay(valuePerBlock))
    };
  });

  return respond(200, farms);
};

// scaling functions
const toHour = (value) => value * 276;
const toDay = (value) => toHour(value) * 24;
const format = (value) => parseFloat(value.toFixed(2));
