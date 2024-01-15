
const { addressEquals, logBalance, runScript } = require("./utils")
const { getPairContract } = require("./uni-utils")
const cfg = require('../config.json')

// FlashSwap.sol contract only supports flashswaps from actual Uniswap protocol.
// 'dexFromFactoryAddress' must be the same as in deployed FlashSwap.sol contract.
const flashswapAddress = 'Please enter your account address'
const dexFromFactoryAddress = cfg.uni.factory
const dexToRouterAddress = cfg.sushi.router

// uses deafult ethers account if accountAddress is undefined
var accountAddress = 'Please enter your account address'

const token0Address = cfg.DAI
const token1Address = cfg.WETH
const tokenBorrowAddress = token0Address
const amountBorrow = '1000'

runScript(async function () {
    if (accountAddress) {
        await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [accountAddress] })
    } else {
        accountAddress = await (await ethers.provider.getSigner()).getAddress()
    }
    const signer = await ethers.provider.getSigner(accountAddress)
    await logBalance(accountAddress, token0Address, token1Address)

    const pair = await getPairContract(dexFromFactoryAddress, token0Address, token1Address)
    const amount0 = addressEquals(await pair.token0(), tokenBorrowAddress) ? amountBorrow : '0'
    const amount1 = addressEquals(await pair.token1(), tokenBorrowAddress) ? amountBorrow : '0'
    const data = ethers.utils.defaultAbiCoder.encode(['address'], [dexToRouterAddress])

    const tokenBorrow = await ethers.getContractAt('@uniswap/v2-periphery/contracts/interfaces/IERC20.sol:IERC20', tokenBorrowAddress)
    console.log(`Borrowing ${amountBorrow} ${await tokenBorrow.symbol()} to flashswap...`)

    try {
        const tx = await pair.connect(signer).swap(ethers.utils.parseUnits(amount0), ethers.utils.parseUnits(amount1), flashswapAddress, data)
        const receipt = await tx.wait()
        console.log(`Flashswap success: tx = ${receipt.transactionHash}`)
        await logBalance(accountAddress, token0Address, token1Address)
    } catch (error) {
        console.log(`Flashswap error: ${error}`)
    }
})