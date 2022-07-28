import Web3 from "web3";
import { RELAYER_PK as EOA_PK, RPC_URL, CHAIN_ID } from "../constants";

const web3 = new Web3(RPC_URL);
const wallet = web3.eth.accounts.wallet.add(EOA_PK);

const getTransaction = async () => {
  const txRequest = {
    to: "0x6f2f050bee10c66EE29B798C6550d0733fE8cDab",
    from: wallet.address,
    nonce: await web3.eth.getTransactionCount(wallet.address),
    gasLimit: 100_000,
    gasPrice: 10_000_000_000,
    data: "0x",
    value: web3.utils.toWei("1"),
    chainId: CHAIN_ID,
  };

  const signature = await wallet.signTransaction(txRequest);
  const calculatedTransactionHash = signature.transactionHash;

  console.log("Calculated Transaction Hash", calculatedTransactionHash);

  const transaction = await web3.eth.sendTransaction(txRequest);

  console.log("Actual Transaction Hash", transaction.transactionHash);

  console.log(
    "Success?",
    calculatedTransactionHash === transaction.transactionHash ? "✅" : "❌"
  );
};

getTransaction();
