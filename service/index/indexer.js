const { getJar, getBlock, getIndexedBlock, saveItem } = require("../util/util");

const THIRTY_MIN_BLOCKS = parseInt(30 * 60 / 13);
module.exports.indexAsset =  async (event, getPrice) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.ASSET_DATA, asset, createdBlock);
  console.log(`Index ${asset} at height: ${block}`);

  while (true) {
    const jar = await getJar(contract, block);
    console.log(jar);

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
    const value = balance * await getPrice(jarData);
    
    const snapshot = {
      asset: asset,
      height: block,
      timestamp: timestamp,
      balance: balance,
      supply: supply,
      ratio: ratio,
      value: parseFloat(value.toFixed(2)),
    };

    saveItem(process.env.ASSET_DATA, snapshot);
    block += THIRTY_MIN_BLOCKS;
  }

  return 200;
};
