'use client';  // Ensure this is a client component

import React, { useState } from 'react';
import { ethers } from 'ethers';
import ZkVotingABI from '../abi/ZkVotingABI.json';
const votingContractAddress = "0x6bff5B1F596C58398092f439B7D5674bD8aA6fC2";
const sepoliaExplorerBaseUrl = "https://sepolia.etherscan.io/tx/";

export default function Home() {
  const [vote, setVote] = useState('');
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // State to track error messages
  const [successMessage, setSuccessMessage] = useState(''); // State to track success messages
  const [txHash, setTxHash] = useState(''); // State to track transaction hash

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []); // Request accounts
      const signer = provider.getSigner();
      return signer; // Return the signer for future use
    } else {
      setErrorMessage("Please install MetaMask!");  // Set error message
    }
  };

  // Function to check if the user has already voted
  const hasVoted = async (address) => {
    const signer = await connectWallet();
    const votingContract = new ethers.Contract(votingContractAddress, ZkVotingABI, signer);

    try {
      const voteStatus = await votingContract.votes(address);
      return voteStatus.hasVoted;  // Returns true if the user has already voted
    } catch (error) {
      console.error("Error checking vote status:", error);
      return false;  // Default to false if there's an error
    }
  };

  const generateProof = async () => {
    setErrorMessage(''); // Clear previous errors
    setSuccessMessage(''); // Clear previous success messages
    setTxHash(''); // Clear transaction hash

    const signer = await connectWallet();
    const address = await signer.getAddress();

    const voted = await hasVoted(address);
    if (voted) {
      setErrorMessage("You have already voted. Multiple votes are not allowed.");
      return;
    }

    setLoading(true);
    const response = await fetch('/api/generateProof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteChoice: vote, voteLimit: 2 })
    });

    const data = await response.json();
    setProof(data);
    setSuccessMessage("Proof generated successfully! Ready to submit.");
    setLoading(false);
  };

  // Function to submit the vote by calling the ZkVoting smart contract
  const submitVote = async () => {
    setErrorMessage(''); // Clear previous errors
    setSuccessMessage(''); // Clear previous success messages
    setTxHash(''); // Clear transaction hash

    if (!proof) {
      setErrorMessage("Please generate proof first.");
      return;
    }

    const signer = await connectWallet();  // Connect to MetaMask wallet
    const votingContract = new ethers.Contract(votingContractAddress, ZkVotingABI, signer);

    // Extract the proof components from the generated proof
    const proofData = {
      a: proof.proof.a,  // [ "0x...", "0x..." ]
      b: proof.proof.b,  // [[ "0x...", "0x..." ], [ "0x...", "0x..." ]]
      c: proof.proof.c,  // [ "0x...", "0x..." ]
    };
    const inputs = proof.inputs;  // Public inputs for the proof

    try {
      // Call the vote function in the ZkVoting contract
      const tx = await votingContract.vote(proofData, inputs);
      setTxHash(tx.hash); // Store the transaction hash
      await tx.wait();  // Wait for the transaction to be mined
      setSuccessMessage("Vote submitted successfully!");  // Set success message
    } catch (error) {
      if (error.message.includes("You have already voted")) {
        setErrorMessage("You have already voted. Multiple votes are not allowed.");
      } else {
        console.error("Error submitting vote:", error);
        setErrorMessage("An error occurred while submitting your vote. Please try again.");
      }
    }
  };

  return (
    <div className="container">
      <h1>zk-SNARK Private Voting DApp</h1>

      <div className="form-container">
        <input
          type="number"
          value={vote}
          onChange={(e) => setVote(e.target.value)}
          placeholder="Enter vote (1 or 2)"
          className="input-field"
        />

        <button
          onClick={generateProof}
          className="btn generate-btn"
          disabled={loading}
        >
          {loading ? "Generating Proof..." : "Generate Proof"}
        </button>

        <button
          onClick={submitVote}
          className="btn submit-btn"
          disabled={!proof || loading}
        >
          Submit Vote
        </button>
      </div>

      {/* Display success or error messages */}
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Display "View Transaction" button if a transaction hash is available */}
      {txHash && (
        <a
          href={`${sepoliaExplorerBaseUrl}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn view-tx-btn"
        >
          View Transaction
        </a>
      )}
    </div>
  );
}
