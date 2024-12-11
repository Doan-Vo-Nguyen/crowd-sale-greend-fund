require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  // Kết nối đến mạng
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log(`Deploying contracts from account: ${wallet.address}`);

  // 1. Đọc ABI và bytecode của GreenToken
  const greenTokenAbi = JSON.parse(fs.readFileSync('./build/GreenToken.abi.json', 'utf8'));
  const greenTokenBytecode = fs.readFileSync('./build/GreenToken.bytecode.txt', 'utf8').trim();

  // 2. Deploy GreenToken
  console.log('Deploying GreenToken...');
  const greenTokenFactory = new ethers.ContractFactory(greenTokenAbi, greenTokenBytecode, wallet);
  const greenToken = await greenTokenFactory.deploy();
  await greenToken.deployed();
  console.log('GreenToken deployed at:', greenToken.address);

  // 3. Đọc ABI và bytecode của EcoToken
  const ecoTokenAbi = JSON.parse(fs.readFileSync('./build/EcoToken.abi.json', 'utf8'));
  const ecoTokenBytecode = fs.readFileSync('./build/EcoToken.bytecode.txt', 'utf8').trim();

  // 4. Deploy EcoToken
  console.log('Deploying EcoToken...');
  const ecoTokenFactory = new ethers.ContractFactory(ecoTokenAbi, ecoTokenBytecode, wallet);
  const ecoToken = await ecoTokenFactory.deploy();
  await ecoToken.deployed();
  console.log('EcoToken deployed at:', ecoToken.address);

  // 5. Đọc ABI và bytecode của Crowdsale
  const crowdsaleAbi = JSON.parse(fs.readFileSync('./build/Crowdsale.abi.json', 'utf8'));
  const crowdsaleBytecode = fs.readFileSync('./build/Crowdsale.bytecode.txt', 'utf8').trim();

  // 6. Deploy Crowdsale
  console.log('Deploying Crowdsale...');
  const crowdsaleFactory = new ethers.ContractFactory(crowdsaleAbi, crowdsaleBytecode, wallet);
  const crowdsale = await crowdsaleFactory.deploy(greenToken.address, ecoToken.address); // Truyền địa chỉ token
  await crowdsale.deployed();
  console.log('Crowdsale deployed at:', crowdsale.address);

  // (Tùy chọn) Thiết lập quyền owner cho Crowdsale
  console.log('Transferring token ownership to Crowdsale...');
  const transferGreenTx = await greenToken.transferOwnership(crowdsale.address);
  await transferGreenTx.wait();

  const transferEcoTx = await ecoToken.transferOwnership(crowdsale.address);
  await transferEcoTx.wait();

  console.log('Ownership transferred to Crowdsale.');

  console.log('Deployment complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error deploying contracts:', error);
    process.exit(1);
  });
