const fetch = require("node-fetch");
const { getBlock, getIndexedBlock, saveItem, getJar } = require("../../util");

const THIRTY_MIN_BLOCKS = parseInt(30 * 60 / 13);
exports.handler =  async (event) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.ASSET_DATA, asset, createdBlock);
  console.log(`Index ${asset} at height: ${block}`);

  while (true) {
    const jar = await getJar(contract, block);

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
    const value = (await getBalance(jarData.token.id, block, balance)).toFixed(2);

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

const getBalance = async (token, block, supply) => {
  const query = `
    {
      pair(id: "${token}", block: {number: ${block}}) {
        reserveUSD
        totalSupply
      }
    }
  `;
  const queryResult = await fetch(process.env.UNISWAP, {
    method: "POST",
    body: JSON.stringify({query})
  }).then(response => response.json());
  const reserveUSD = queryResult.data.pair.reserveUSD;
  const pairSupply = queryResult.data.pair.totalSupply;
  return reserveUSD * (supply / pairSupply);
};
