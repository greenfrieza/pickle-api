const { getJar, getBlock, saveItem } = require("../util/util");

const TEN_MIN_BLOCKS = parseInt(10 * 60 / 13);
module.exports.indexAsset =  async (event, getPrice) => {
  const { asset, createdBlock, contract } = event;
  let block = await getIndexedBlock(process.env.ASSET_DATA, asset, createdBlock);
  console.log(`Index ${asset} at height: ${block}`);

  while (true) {
    const jar = await getJar(contract, block);

    if (jar.errors != undefined && jar.errors != null) {
      break;
    }

    if (jar.data == null || jar.data.jar == null) {
      block += TEN_MIN_BLOCKS;
      continue;
    }

    const jarData = jar.data.jar;
    const blockData = await getBlock(block);
    const timestamp = blockData.timestamp * 1000;
    const balance = jarData.balance / Math.pow(10, 18);
    const supply = jarData.totalSupply / Math.pow(10, 18);
    const ratio = jarData.ratio / Math.pow(10, 18);
    const value = balance * getPrice();
    
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
    block += TEN_MIN_BLOCKS;
  }

  return 200;
};

const getIndexedBlock = async (table, asset, createdBlock) => {
  const params = {
    TableName: table,
    KeyConditionExpression: "asset = :asset",
    ExpressionAttributeValues: {
        ":asset": asset
    },
    ScanIndexForward: false,
    Limit: 1,
  };
  let result = await ddb.query(params).promise();
  return result.Items.length > 0 ? result.Items[0].height : createdBlock;
};
