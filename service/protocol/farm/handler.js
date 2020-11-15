const { getMasterChef } = require("../../util/masterChef");
const { respond } = require("../../util/util");
const { jars } = require("../../jars");

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const masterChefData = await getMasterChef();
  const masterChef = masterChefData.data.masterChef;
  const masterChefPools = masterChefData.data.masterChefPools;

  const farms = {};
  masterChefPools.forEach(pool => {
    const allocShare = pool.allocPoint / masterChef.totalAllocPoint;
    const farmName = Object.keys(jars).find(key => jars[key].token === pool.token.id);
    farms[farmName] = allocShare * 100;
  });

  return respond(200, farms);
};
