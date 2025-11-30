import { ethers } from "ethers";
import axios from "axios";
import { transactor } from "../helpers/txHelper.js";

// Create axios instance with JSON validation
const cBridgeAxios = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  responseType: 'json',
});

// Add response interceptor to validate JSON responses
cBridgeAxios.interceptors.response.use(
  (response) => {
    // Validate response data is JSON
    if (response.data && typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('cBridge API returned HTML instead of JSON:', response.data.substring(0, 100));
      throw new Error('cBridge API returned HTML instead of JSON');
    }
    return response;
  },
  (error) => {
    // Check if we received HTML instead of JSON
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
      console.error('cBridge API returned HTML error page:', error.response.data.substring(0, 200));
      return Promise.reject(new Error('cBridge API is unreachable or returned an error page'));
    }
    return Promise.reject(error);
  }
);

export async function poolBasedTransfer({
  bridge,
  addr,
  estimateRequest,
  transferObject,
  signer,
  isNative,
}) {
  const { transferToken, toChain, value, nonce } = transferObject;

  //   const estimateAmount = await estimateAmt(estimateRequest);
  //   const slippage =
  //     estimateRequest.getSlippageTolerance() ||
  //     estimateAmount.getMaxSlippage() ||
  //     0;

  //   console.log("slippage: ", slippage);

  console.log({
    addr: addr,
    token: transferToken?.token?.address,
    amount: value,
    dstChainId: toChain?.id,
    nonce: nonce,
    maxSlippage: 5000,
  });

  try {
    const result = await transactor(
      isNative
        ? bridge.sendNative(
            addr,
            value,
            ethers.toBigInt(toChain?.id),
            ethers.toBigInt(nonce),
            5000,
            { value, gasLimit: 200000 }
          )
        : bridge.send(
            addr,
            transferToken?.token?.address,
            value,
            ethers.toBigInt(toChain?.id),
            ethers.toBigInt(10),
            5000,
            { gasLimit: 200000 }
          ),
      signer
    );

    return result;
  } catch (error) {
    console.error("Error in poolBasedTransfer:", error?.message || error);
    throw error;
  }
}

export async function estimateAmt({
  baseUrl,
  srcChainId,
  dstChainId,
  tokenSymbol,
  walletAddress = "",
  slippageTolerance,
  amount,
  isPegged = false,
}) {
  try {
    const url = `${baseUrl}/v2/estimateAmt?src_chain_id=${srcChainId}&dst_chain_id=${dstChainId}&token_symbol=${tokenSymbol}&amt=${amount}&slippage_tolerance=${slippageTolerance}${
      walletAddress ? `&usr_addr=${walletAddress}` : ""
    }${isPegged ? "&is_pegged=true" : ""}`;

    const response = await cBridgeAxios.get(url);

    return response.data;
  } catch (error) {
    console.error("Error in estimateAmt:", error?.message || error);
    throw error;
  }
}
