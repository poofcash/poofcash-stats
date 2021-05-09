import React from "react";
import { Container, Flex, Text } from "theme-ui";
import { network } from "connectors";
import { useWeb3React } from "@web3-react/core";
import { NetworkContextName } from "index";
import Modal from "react-modal";
import { Header } from "components/Header";
import "i18n/config";
import { useTranslation } from "react-i18next";
import { instances } from "@poofcash/poof-token";
import { CHAIN_ID, RPC_URL } from "config";
import { getDeposits } from "hooks/readContract";
import { newKit } from "@celo/contractkit";
import moment from "moment";

const kit = newKit(RPC_URL);
console.log(RPC_URL);
const oneGold = kit.web3.utils.toWei("1", "ether");
const tornadoAddresses: Array<[string, string]> = Object.entries(
  instances[`netId${CHAIN_ID}`]["celo"]["instanceAddress"]
);

const getCeloVolume = async (library: any, fromTimestamp: number) => {
  const depositEvents = await Promise.all(
    tornadoAddresses.map(([_, address]) => getDeposits(library, address))
  );
  return tornadoAddresses.reduce((acc, [amt], idx) => {
    const volume =
      Number(amt) *
      depositEvents[idx].filter((event) => event.timestamp >= fromTimestamp)
        .length;
    return acc + volume;
  }, 0);
};

const LabelValue: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  return (
    <Flex sx={{ alignItems: "baseline", mb: 2 }}>
      <Text mr={2} variant="bold">
        {label}:
      </Text>{" "}
      <Text>{value}</Text>
    </Flex>
  );
};

const roundCurrency = (amt: number) => Math.round(amt * 100) / 100;

const App = () => {
  const { t } = useTranslation();
  const { activate: activateNetwork, library } = useWeb3React(
    NetworkContextName
  );
  React.useEffect(() => {
    Modal.setAppElement("body");
    if (!library) {
      activateNetwork(network);
    }
  }, [library, activateNetwork]);

  const [celoPrice, setCeloPrice] = React.useState(0);
  const [totalCeloVolume, setTotalCeloVolume] = React.useState(0);
  const [dailyCeloVolume, setDailyCeloVolume] = React.useState(0);
  React.useEffect(() => {
    kit.contracts.getExchange().then((exchange) => {
      exchange
        .quoteGoldSell(oneGold)
        .then((amountCUSD) =>
          setCeloPrice(amountCUSD.toNumber() / Math.pow(10, 18))
        );
    });
    getCeloVolume(library, 0).then(setTotalCeloVolume);
    getCeloVolume(
      library,
      moment.utc().add(-24, "hours").valueOf() / 1000
    ).then(setDailyCeloVolume);
  }, [library]);

  return (
    <Container
      sx={{
        mx: [0, "15%"],
        my: [0, 4],
        maxWidth: "100%",
        width: "auto",
      }}
    >
      <Header />
      <Container
        sx={{
          px: [3, 0],
          py: [4, 0],
          mt: 6,
        }}
      >
        <Text variant="title" mb={4}>
          {t("title")}
        </Text>
        <LabelValue label={"CELO/USD"} value={`$${roundCurrency(celoPrice)}`} />
        <LabelValue
          label={"Total CELO volume"}
          value={`${totalCeloVolume} CELO / $${roundCurrency(
            totalCeloVolume * celoPrice
          ).toLocaleString()}`}
        />
        <LabelValue
          label={"Past 24 hours CELO volume"}
          value={`${dailyCeloVolume} CELO / $${roundCurrency(
            dailyCeloVolume * celoPrice
          ).toLocaleString()}`}
        />
      </Container>
    </Container>
  );
};

export default App;
