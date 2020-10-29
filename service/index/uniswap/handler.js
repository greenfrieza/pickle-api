const fetch = require("node-fetch");
const { getBlock, getIndexedBlock, saveItem } = require("../util");

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
    const supply = jarData.totalSupply / Math.pow(10, 18);
    const blockData = await getBlock(block);
    const timestamp = blockData.timestamp * 1000;
    const balance = getBalance(jarData.token.id, block, supply);

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
  const query = `
    {
      jar(id: "${contract}", block: {number: ${block}}) {
        token {
          id
        }
        balance
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

const getBalance = async (token, block, supply) => {
  const query = `
    {
      pair(id: "${token}", block: {number: ${block}}) {
        reserveUSD
        totalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.PICKLE, {
    method: "POST",
    body: JSON.stringify({query})
  });
  const pairResult = await queryResult.json();
  const reserveUSD = pairResult.data.pair.reserveUSD;
  const pairSupply = pairResult.data.pair.totalSupply;
  return reserveUSD * (supply / pairSupply);
};
