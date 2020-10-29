const fetch = require("node-fetch");
const { getBlock, getIndexedBlock, saveItem } = require("./util");

const THIRTY_MIN_BLOCKS = parseInt(30 * 60 / 13);
exports.handler =  async (event) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.REWARDS_DATA, asset, createdBlock);
  console.log(`Index rewards contract ${asset} at height: ${block}`);

  while (true) {
    const rewards = await queryRewardsContract(contract, block);

    if (rewards.errors != undefined && rewards.errors != null) {
      break;
    }

    if (rewards.data == null || rewards.data.rewardContracts == null) {
      block += THIRTY_MIN_BLOCKS;
      continue;
    }

    const rewardsData = rewards.data.rewardContracts;
    const blockData = await getBlock(block);
    const timestamp = blockData.timestamp * 1000;
    const paid = rewardsData.totalRewards / Math.pow(10, 18);
    const remaining = rewardsData.currentRewards / Math.pow(10, 18);
    const staked = (rewardsData.stakedTokens / rewardsData.stakingTokenTotalSupply) * 100;

    const snapshot = {
      asset: asset,
      height: block,
      timestamp: timestamp,
      staked: staked,
      paid: paid,
      remaining: remaining,
    }

    console.log(snapshot);
    saveItem(process.env.REWARDS_DATA, snapshot);
    block += THIRTY_MIN_BLOCKS;
  }

  return 200;
};

const queryRewardsContract = async (contract, block) => {
  let query = `
    {
      rewardContract(id: "${contract}", block: {number: ${block}}) {
        totalRewards
        currentRewards
        stakedTokens
        stakingTokenTotalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};
