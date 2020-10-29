const fetch = require("node-fetch");
const { getBlock, getIndexedBlock, saveItem } = require("../../util");

const THIRTY_MIN_BLOCKS = 180;

exports.handler =  async (event) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.ASSET_DATA, asset, createdBlock);
  console.log(`Index rewards contract ${asset} at height: ${block}`);

  while (true) {
    const jar = await queryJar(contract, block);

    if (jar.errors != undefined && jar.errors != null) {
      break;
    }

    if (jar.data == null || jar.data.jar == null) {
      block += THIRTY_MIN_BLOCKS;
      continue;
    }

    const jarData = jar.data.jar;
    const blockData = await getBlock(block);
    const timestamp = blockData.timestamp * 1000;
    const balance = jarData.balance / Math.pow(10, 18);

    const snapshot = {
      asset: asset,
      height: block,
      timestamp: timestamp,
      balance: balance,
    }

    saveItem(process.env.ASSET_DATA, snapshot);
    block += THIRTY_MIN_BLOCKS;
  }

  return 200;
};

const queryJar = async (contract, block) => {
  let query = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        balance
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};
