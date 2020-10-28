const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/701c49f0f48a42aa8672668ea874ba0f"));

module.exports.getBlock = async (blockNumber) => await web3.eth.getBlock(blockNumber);
