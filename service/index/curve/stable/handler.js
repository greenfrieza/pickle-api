const fetch = require("node-fetch");
const { getBlock, getIndexedBlock, saveItem } = require("../../../util");

const THIRTY_MIN_BLOCKS = parseInt(30 * 60 / 13);
exports.handler =  async (event) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.ASSET_DATA, asset, createdBlock);
  console.log(`Index ${asset} at height: ${block}`);

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
    const supply = jarData.totalSupply / Math.pow(10, 18);
    const ratio = jarData.ratio / Math.pow(10, 18);
    const value = balance.toFixed(2);

    const snapshot = {
      asset: asset,
      height: block,
      timestamp: timestamp,
      balance: balance,
      supply: supply,
      ratio: ratio,
      value: value,
    };

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
        ratio
        totalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  return queryResult.json();
};
