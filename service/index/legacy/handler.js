const fetch = require("node-fetch");
const { getBlock, saveItem, getIndexedBlock } = require("../../util");

const jars = {
  daiv1: {
    contract: '0xf79ae82dccb71ca3042485c85588a3e0c395d55b', 
    block: 10882533,
    stopBlock: 10960250,
    asset: 'dai-eth',
    type: 'uni'
  },
  usdcv1: {
    contract: '0x46206e9bdaf534d057be5ecf231dad2a1479258b', 
    block: 10883082,
    stopBlock: 10959402,
    asset: 'usdc-eth',
    type: 'uni'
  },
  usdtv1: {
    contract: '0x3a41ab1e362169974132dea424fb8079fd0e94d8', 
    block: 10882948,
    stopBlock: 10959200,
    asset: 'usdt-eth',
    type: 'uni'
  },
  scrvv1: {
    contract: '0x2385d31f1eb3736be0c3629e6f03c4b3cd997ffd',
    block: 10863877,
    stopBlock: 10958737,
    asset: 'scrv',
    type: 'compound'
  },
}

const THIRTY_MIN_BLOCKS = parseInt(30 * 60 / 13);
exports.handler =  async (event) => {
  for (const [key, value] of Object.entries(jars)) {
    await indexJar(value.type, value.asset, value.contract, value.block, value.stopBlock);
  }
  return 200;
}

async function indexJar(type, asset, contract, block, stopBlock) {
  console.log('index', asset, 'from', block);

  while (true && (stopBlock == undefined || block < stopBlock)) {
    let jar = await queryJar(contract, block);

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

    let value;
    if (type == 'uni') {
      value = (await getUniBalance(jarData.token.id, block, supply)).toFixed(2);
    } else if (type == 'compound') {
      value = supply.toFixed(2);;
    }

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
}

const queryJar = async (contract, block) => {
  let query = `
  {
    jar(id: "${contract}", block: {number: ${block}}) {
      token {
        id
      }
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

const getUniBalance = async (token, block, supply) => {
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
