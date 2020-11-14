const { getMasterChef } = require("../../util");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const data = await getMasterChef();
  const masterChef = data.masterChef;
  const masterChefPools = data.masterChefPools;

  const pickleFarms = masterChefPools.map(pool => {
  });

  return {
    statusCode: 200,
    body: JSON.stringify(user),
    headers: headers,
  };
}
