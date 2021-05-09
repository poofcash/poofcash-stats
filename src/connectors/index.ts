import { Web3Provider } from "@ethersproject/providers";
import { NetworkConnector } from "connectors/NetworkConnector";
import { CHAIN_ID } from "config";

export const network = new NetworkConnector({
  defaultChainId: CHAIN_ID,
});

let networkLibrary: Web3Provider | undefined;
export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary =
    networkLibrary ?? new Web3Provider(network.provider as any));
}
