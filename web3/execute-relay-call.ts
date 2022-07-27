import Web3 from "web3";
import UniversalProfileContract from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import LSP6KeyManagerContract from "@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json";
import {
  RELAYER_PK,
  UP_ADDRESS,
  UP_CONTROLLER_PK,
  RPC_URL,
} from "../constants";

const web3 = new Web3(RPC_URL);

const prepareTransaction = async () => {
  const controllerWallet = web3.eth.accounts.wallet.add(UP_CONTROLLER_PK);

  const UniversalProfile = new web3.eth.Contract(
    UniversalProfileContract.abi as any,
    UP_ADDRESS
  );

  const keyManagerAddress = await UniversalProfile.methods.owner().call();

  const KeyManager = new web3.eth.Contract(
    LSP6KeyManagerContract.abi as any,
    keyManagerAddress
  );

  const abiPayload = UniversalProfile.methods["setData(bytes32,bytes)"](
    "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
    "0xcafecafe"
  ).encodeABI();

  const nonce = await KeyManager.methods
    .getNonce(controllerWallet.address, 0)
    .call();

  const message = web3.utils.soliditySha3(2828, keyManagerAddress, nonce, {
    t: "bytes",
    v: abiPayload,
  }) as string;

  const signatureObject = controllerWallet.sign(message);
  const payloadSignature = signatureObject.signature;

  return {
    payloadSignature,
    nonce,
    abiPayload,
    keyManagerAddress,
  };
};

const executeRelayCall = async ({
  payloadSignature,
  nonce,
  abiPayload,
  keyManagerAddress,
}: {
  payloadSignature: string;
  nonce: string;
  abiPayload: string;
  keyManagerAddress: string;
}) => {
  const relayerWallet = web3.eth.accounts.wallet.add(RELAYER_PK);

  const KeyManager = new web3.eth.Contract(
    LSP6KeyManagerContract.abi as any,
    keyManagerAddress
  );

  const transactionData = KeyManager.methods
    .executeRelayCall(payloadSignature, nonce, abiPayload)
    .encodeABI();

  const txRequest = {
    to: keyManagerAddress,
    from: relayerWallet.address,
    nonce: await web3.eth.getTransactionCount(relayerWallet.address),
    gasLimit: 100_000,
    gasPrice: 10_000_000_000,
    value: "0",
    chainId: 2828,
    data: transactionData,
  };

  const signature = await relayerWallet.signTransaction(txRequest);
  const calculatedTransactionHash = signature.transactionHash;

  console.log("Calculated Transaction Hash", calculatedTransactionHash);

  const transaction = await web3.eth.sendTransaction(txRequest);

  console.log("Actual Transaction Hash", transaction.transactionHash);

  console.log(
    "Success?",
    calculatedTransactionHash === transaction.transactionHash ? "✅" : "❌"
  );
};

const run = async () => {
  await executeRelayCall(await prepareTransaction());
};

run();
