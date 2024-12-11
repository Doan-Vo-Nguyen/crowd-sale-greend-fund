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
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log("Provider:", provider); 
  
      const greenToken = new ethers.Contract(GREEN_TOKEN_ADDRESS, greenTokenABI, provider);
      console.log("Green Token Contract:", greenToken);
  
      const ecoToken = new ethers.Contract(ECO_TOKEN_ADDRESS, ecoTokenABI, provider);
      console.log("Eco Token Contract:", ecoToken);
  
      const greenBalance = await greenToken.balanceOf(address);
      console.log("Raw Green Balance:", greenBalance); 
      setGreenBalance(ethers.utils.formatEther(greenBalance));
  
      const ecoBalance = await ecoToken.balanceOf(address);
      console.log("Raw Eco Balance:", ecoBalance);
      setEcoBalance(ethers.utils.formatEther(ecoBalance));
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  const fetchCurrentSale = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, provider);
  
      const saleId = await contract.currentSaleId();
      console.log(`Current Sale ID: ${saleId}`);
  
      const sale = await contract.sales(saleId);
      console.log('Fetched Sale Data:', sale);
  
      // Add fallback values if any property is undefined
      const cap = sale.cap ? sale.cap : ethers.BigNumber.from(0);
      const soldAmount = sale.soldAmount ? sale.soldAmount : ethers.BigNumber.from(0);
      const rate = sale.rate ? sale.rate : ethers.BigNumber.from(1);
  
      setSaleInfo({
        cap: ethers.utils.formatEther(cap),
        sold: ethers.utils.formatEther(soldAmount),
        active: sale.isActive,
        remaining: ethers.utils.formatEther(cap.sub(soldAmount)),
        rate: ethers.utils.formatUnits(rate, 0),
        timeLeft: sale.endTime.toNumber() - Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      console.error("Error fetching sale info:", error);
    }
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
    const tx = await contract.setPrice(GREEN_TOKEN_ADDRESS, price);
    await tx.wait();
  };

  const sellToken = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CROWDSALE_ADDRESS, crowdsaleABI, signer);
  
      // Reversing the arguments: first the address, then the parsed amount
      const tx = await contract.sellToken(GREEN_TOKEN_ADDRESS, sellAmount);
  
      await tx.wait();
      console.log('Token sale successful');
    } catch (error) {
      console.error('Error selling token:', error);
    }
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
