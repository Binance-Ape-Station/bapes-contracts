const BinanceApeStationToken = artifacts.require("BinanceApeStationToken");
const BinanceApePropulsor = artifacts.require("BinanceApePropulsor");

const truffleAssert = require("truffle-assertions");
const { advanceBlock } = require("./utils");
const { toWei, toBN } = web3.utils;

const BLOCKS_BETWEEN_PROPULSION = 30;

contract("BinanceApePropulsor", async (accounts) => {
  let tokenInstance;
  let propulsorInstance;

  before(async () => {
    tokenInstance = await BinanceApeStationToken.deployed();
    propulsorInstance = await BinanceApePropulsor.deployed();

    // Set blocks between propulsions
    await propulsorInstance.setBlocksBetweenPropulsion(
      BLOCKS_BETWEEN_PROPULSION
    );

    // Set minimum staking amount to be propelled
    const minStakingToBePropelled = toWei("1", "ether");
    await propulsorInstance.setMinStakingToBePropelled(minStakingToBePropelled);

    // Set the staking contract
    await tokenInstance.setStakingContract(propulsorInstance.address);
    // Add the staking contract to the excluded fees list
    await tokenInstance.setExcludedFeesAddr(propulsorInstance.address, true);

    const transferAmount = toWei("10", "ether");
    await truffleAssert.passes(
      tokenInstance.transfer(accounts[1], transferAmount, {
        from: accounts[0],
      }),
      "transfer failed"
    );

    const approveAmount = toWei("100", "ether");
    await tokenInstance.approve(propulsorInstance.address, approveAmount, {
      from: accounts[1],
    });
  });

  it("deposit less than minimum", async () => {
    const depositAmount = toWei("0.99", "ether");
    await truffleAssert.reverts(
      propulsorInstance.deposit(depositAmount, {
        from: accounts[1],
      }),
      "BAPES Propulsor: insufficient amount"
    );
  });

  it("deposit", async () => {
    const depositAmount = toWei("1", "ether");
    await truffleAssert.passes(
      propulsorInstance.deposit(depositAmount, {
        from: accounts[1],
      }),
      "deposit failed"
    );

    const activeStakerBN = await propulsorInstance.getActiveStaker();
    assert(activeStakerBN.toString(), "1");
  });

  it("pulse", async () => {
    // Activate fees
    await tokenInstance.setFeesActivated(true);

    const depositAmount = toWei("1", "ether");
    await truffleAssert.passes(
      propulsorInstance.deposit(depositAmount, { from: accounts[1] }),
      "deposit failed"
    );

    const firstTransferAmount = toWei("5", "ether");
    await truffleAssert.passes(
      tokenInstance.transfer(accounts[1], firstTransferAmount, {
        from: accounts[0],
      }),
      "first transfer failed"
    );

    const fuelToWinBeforePropulsionBN = await propulsorInstance.getFuelToWin();
    assert(fuelToWinBeforePropulsionBN.gt(toBN(0)));

    for (let i = 0; i <= BLOCKS_BETWEEN_PROPULSION; i++) {
      await advanceBlock();
    }

    const balanceBeforePropulsionBN = await tokenInstance.balanceOf(
      accounts[1]
    );

    const secondTransferAmount = toWei("1", "ether");
    const secondTransferTx = await tokenInstance.transfer(
      accounts[2],
      secondTransferAmount,
      { from: accounts[0] }
    );
    await truffleAssert.passes(secondTransferTx, "second transfer failed");

    const fuelToWinAfterPropulsionBN = await propulsorInstance.getFuelToWin();
    assert.equal(fuelToWinAfterPropulsionBN.toString(), 0);

    const balanceAfterPropulsionBN = await tokenInstance.balanceOf(accounts[1]);
    assert(
      balanceAfterPropulsionBN.toString(),
      balanceBeforePropulsionBN
        .add(fuelToWinBeforePropulsionBN)
        .add(toBN(toWei("0.05", "ether")))
        .toString()
    );
  });

  it("withdraw", async () => {
    const balanceBeforeWithdrawBN = await tokenInstance.balanceOf(accounts[1]);

    await truffleAssert.passes(
      propulsorInstance.withdraw({
        from: accounts[1],
      }),
      "withdraw failed"
    );

    const balanceAfterWithdrawBN = await tokenInstance.balanceOf(accounts[1]);
    assert(balanceAfterWithdrawBN.gt(balanceBeforeWithdrawBN));
  });
});
