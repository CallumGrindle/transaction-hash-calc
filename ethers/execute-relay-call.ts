import { Contract, ethers, Signer } from "ethers";
import UniversalProfileContract from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import LSP6KeyManagerContract from "@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json";
import {
  RELAYER_PK,
  UP_ADDRESS,
  UP_CONTROLLER_PK,
  RPC_URL,
} from "../constants";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const prepareTransaction = async () => {
  const controllerSigner = new ethers.Wallet(UP_CONTROLLER_PK, provider);

  const UniversalProfile = new Contract(
    UP_ADDRESS,
    UniversalProfileContract.abi,
    provider
  );

  const keyManagerAddress = await UniversalProfile.owner();

  const KeyManager = new Contract(
    keyManagerAddress,
    LSP6KeyManagerContract.abi,
    provider
  );

  const abiPayload = UniversalProfile.interface.encodeFunctionData(
    "setData(bytes32,bytes)",
    [
      "0xcafecafecafecafecafecafecafecafecafecafecafecafecafecafecafecafe",
      "0xbeefcafe",
    ]
  );

  const nonce = await KeyManager.getNonce(controllerSigner.address, 0);

  const message = ethers.utils.solidityKeccak256(
    ["uint256", "address", "uint256", "bytes"],
    [2828, keyManagerAddress, nonce.toNumber(), abiPayload]
  );

  const payloadSignature = await controllerSigner.signMessage(
    ethers.utils.arrayify(message)
  );

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
  const relayerSigner = new ethers.Wallet(RELAYER_PK, provider);

  const KeyManager = new Contract(
    keyManagerAddress,
    LSP6KeyManagerContract.abi,
    relayerSigner
  );

  const transactionData = KeyManager.interface.encodeFunctionData(
    "executeRelayCall(bytes,uint256,bytes)",
    [payloadSignature, nonce, abiPayload]
  );

  const txRequest = {
    to: keyManagerAddress,
    from: relayerSigner.address,
    nonce: await provider.getTransactionCount(relayerSigner.address),
    gasLimit: 100_000,
    value: ethers.utils.hexlify(0),
    type: 2,
    chainId: 2828,
    data: transactionData,
  };

  const populatedTransaction = await relayerSigner.populateTransaction(
    txRequest
  );

  const ethersSignature = await relayerSigner.signTransaction(
    populatedTransaction
  );
  const calculatedTransactionHash = ethers.utils.keccak256(ethersSignature);

  console.log("Calculated Transaction Hash", calculatedTransactionHash);

  const transaction = await relayerSigner.sendTransaction(txRequest);

  console.log("Actual Transaction Hash", transaction.hash);

  console.log(
    "Success?",
    calculatedTransactionHash === transaction.hash ? "✅" : "❌"
  );
};

const run = async () => {
  await executeRelayCall(await prepareTransaction());
};

run();
