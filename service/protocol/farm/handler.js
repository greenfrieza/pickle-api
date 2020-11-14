const fetch = require("node-fetch");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.source === "serverless-plugin-warmup") {
    return 200;
  }

  const data = await queryMasterchef();
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

const queryMasterchef = async (contract, block) => {
  let query = `
    {
      masterChef(id: "0xbd17b1ce622d73bd438b9e658aca5996dc394b0d") {
        id
        totalAllocPoint
        rewardsPerBlock
      },
      masterChefPools(where: {allocPoint_gt: 0}, orderBy: allocPoint, orderDirection: desc) {
        id
        token {
          id
        }
        balance
        allocPoint
        lastRewardBlock
        accPicklePerShare
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};
