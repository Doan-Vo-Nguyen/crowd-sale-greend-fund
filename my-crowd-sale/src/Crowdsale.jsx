import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import crowdsaleABI from './build/Crowdsale.abi.json';
import ecoTokenABI from './build/EcoToken.abi.json';
import greenTokenABI from './build/GreenToken.abi.json';
import './App.css';

const GREEN_TOKEN_ADDRESS = "0xad0852764e45037e9feaa8af5d48029d2ab37365";
const ECO_TOKEN_ADDRESS = "0x2a1094c204e6de85d02015e5cf1a618923851c24";
const CROWDSALE_ADDRESS = "0x6ab3199d7c0069c6fd6332bf7ceedb85d96b8e2c";

function App() {
  const [account, setAccount] = useState('');
  const [greenBalance, setGreenBalance] = useState('0');
  const [ecoBalance, setEcoBalance] = useState('0');
  const [saleInfo, setSaleInfo] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [price, setPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  useEffect(() => {
    if (account) {
      fetchBalances(account);
      fetchCurrentSale();
      checkOwnerStatus(account);
    }
  }, [account]);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAccount(accounts[0]);
    }
  };

  const checkOwnerStatus = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);
    const owner = await contract.owner();
    setIsOwner(owner.toLowerCase() === address.toLowerCase());
  };

  const fetchBalances = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const greenToken = new ethers.Contract(GREEN_TOKEN_ADDRESS, greenTokenABI, provider);
    const ecoToken = new ethers.Contract(ECO_TOKEN_ADDRESS, ecoTokenABI, provider);
    setGreenBalance(ethers.utils.formatEther(await greenToken.balanceOf(address)));
    setEcoBalance(ethers.utils.formatEther(await ecoToken.balanceOf(address)));
  };

  const fetchCurrentSale = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);
    const saleId = await contract.currentSaleId();
    const sale = await contract.sales(saleId);
    setSaleInfo({
      cap: ethers.utils.formatEther(sale.cap),
      rate: sale.rate.toString(),
      sold: ethers.utils.formatEther(sale.soldAmount),
      isActive: sale.isActive,
    });
  };

  const approveTokens = async (amount, tokenAddress) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const token = new ethers.Contract(tokenAddress, greenTokenABI, signer);
    const tx = await token.approve(CROWDSALE_ADDRESS, ethers.utils.parseEther(amount));
    await tx.wait();
  };

  const setTokenPrice = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
    const tx = await contract.setPrice(ethers.utils.parseEther(price));
    await tx.wait();
  };

  const sellToken = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
    const tx = await contract.sellToken(ethers.utils.parseEther(sellAmount));
    await tx.wait();
  };

  const withdrawTokens = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
    const tx = await contract.withdrawToken();
    await tx.wait();
  };

  return (
    <div className="App">
      <h1>Green Fund ICO</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Account: {account}</p>
          <p>Green Balance: {greenBalance}</p>
          <p>Eco Balance: {ecoBalance}</p>
          <p>Sale Info: Cap: {saleInfo.cap}, Rate: {saleInfo.rate}</p>

          {isOwner ? (
            <div>
              <h2>Owner Functions</h2>
              <input type="text" placeholder="Set Price" value={price} onChange={(e) => setPrice(e.target.value)} />
              <button onClick={setTokenPrice}>Set Price</button>
              <input type="text" placeholder="Amount to Sell" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
              <button onClick={sellToken}>Sell Tokens</button>
              <button onClick={withdrawTokens}>Withdraw Tokens</button>
            </div>
          ) : (
            <div>
              <h2>Buy Tokens</h2>
              <button onClick={approveTokens}>Approve</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
