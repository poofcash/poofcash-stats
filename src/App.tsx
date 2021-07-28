import React from "react";
import { Container, Text, Divider, Box } from "theme-ui";
import { Header } from "components/Header";
import "i18n/config";
import { useTranslation } from "react-i18next";
import { deployments, mainnetAddresses } from "@poofcash/poof-kit";
import { CHAIN_ID, RPC_URL } from "config";
import { newKit } from "@celo/contractkit";
import TornadoProxyABI from "abis/TornadoProxy.json";
import { AbiItem } from "web3-utils";
import { TornadoProxy } from "generated/TornadoProxy";
import { PoolStats } from "components/PoolStats";
import { LabelValue } from "components/LabelValue";
import { fromWei } from "web3-utils";
import { RewardsCELO } from "generated/RewardsCELO";
import RewardsCELOABI from "abis/RewardsCELO.json";

const kit = newKit(RPC_URL);
const oneGold = kit.web3.utils.toWei("1", "ether");

const celo = deployments[`netId${CHAIN_ID}`]["celo"].tokenAddress;
const rcelo = deployments[`netId${CHAIN_ID}`]["rcelo"].tokenAddress;
const celoAddresses: Array<[string, string]> = Object.entries(
  deployments[`netId${CHAIN_ID}`]["celo"]["instanceAddress"]
);
const rCeloAddresses: Array<[string, string]> = Object.entries(
  deployments[`netId${CHAIN_ID}`]["rcelo"]["instanceAddress"]
);

const App = () => {
  const { t } = useTranslation();
  const [celoPrice, setCeloPrice] = React.useState(0);
  const [rCELOTVL, setRCELOTVL] = React.useState(0);
  const rCeloPrice = celoPrice / 65000;
  React.useEffect(() => {
    kit.contracts.getExchange().then((exchange) => {
      exchange
        .quoteGoldSell(oneGold)
        .then((amountCUSD) =>
          setCeloPrice(amountCUSD.toNumber() / Math.pow(10, 18))
        );
    });
    const rCeloContract = (new kit.web3.eth.Contract(
      RewardsCELOABI as AbiItem[],
      rcelo
    ) as unknown) as RewardsCELO;
    rCeloContract.methods
      .getTotalSupplyCELO()
      .call()
      .then((totalSupply) => {
        setRCELOTVL(Number(fromWei(totalSupply.toString())) * celoPrice);
      });
  }, [celoPrice]);

  const [proxyUsers, setProxyUsers] = React.useState<string[]>([]);
  React.useEffect(() => {
    const proxy = (new kit.web3.eth.Contract(
      TornadoProxyABI as AbiItem[],
      mainnetAddresses.PoofProxy.address
    ) as unknown) as TornadoProxy;
    proxy
      .getPastEvents("EncryptedNote", {
        fromBlock: 0,
        toBlock: "latest",
      })
      .then((events) =>
        setProxyUsers(
          events.map((event) => event.returnValues.sender as string)
        )
      );
  }, []);

  const uniqueUsers = Object.keys(
    proxyUsers.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
  );

  return (
    <Container
      sx={{
        mx: [4, "15%"],
        my: [4, 4],
        maxWidth: "100%",
        width: "auto",
      }}
    >
      <Header />
      <Container
        sx={{
          mt: 6,
        }}
      >
        <Text variant="title" mb={4}>
          {t("title")}
        </Text>
        <Box sx={{ textAlign: "center" }}>
          <Text variant="largeNumber" mb={2}>
            {rCELOTVL.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </Text>
          <Text>rCELO TVL</Text>
        </Box>
        <Divider sx={{ my: 4 }} />
        <PoolStats
          tokenAddress={rcelo}
          tokenPools={rCeloAddresses}
          tokenPriceUsd={rCeloPrice}
        />
        <Divider sx={{ my: 4 }} />
        <PoolStats
          tokenAddress={celo}
          tokenPools={celoAddresses}
          tokenPriceUsd={celoPrice}
        />
        <Divider sx={{ my: 4 }} />
        <LabelValue
          label={"Total of unique wallets"}
          value={`${uniqueUsers.length.toLocaleString()} wallets`}
        />
      </Container>
    </Container>
  );
};

export default App;
