const { TOKEN_CONTRACT } = require("../constants");

const BinanceApeStationToken = artifacts.require("BinanceApeStationToken");
const BinanceApePropulsor = artifacts.require("BinanceApePropulsor");

module.exports = async function (deployer, network) {
  let tokenInstance = null;

  let tokenContractAddress = TOKEN_CONTRACT[network];

  if (tokenContractAddress && tokenContractAddress !== "") tokenInstance = await BinanceApeStationToken.at(tokenContractAddress);
  else tokenInstance = await BinanceApeStationToken.deployed();

  await deployer.deploy(BinanceApePropulsor, tokenInstance.address);
};
