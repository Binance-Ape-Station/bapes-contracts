const { ANTI_BOT_CONTRACT } = require("../constants");

const BinanceApeStationToken = artifacts.require("BinanceApeStationToken");

module.exports = async function (deployer, network) {
  let antiBotContractAddress = ANTI_BOT_CONTRACT[network];
  if (!antiBotContractAddress) antiBotContractAddress = ZERO_ADDR;

  await deployer.deploy(BinanceApeStationToken, antiBotContractAddress);
};
