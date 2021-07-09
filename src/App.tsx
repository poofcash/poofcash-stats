import React from "react";
import { Container, Flex, Text, Divider } from "theme-ui";
import { Header } from "components/Header";
import "i18n/config";
import { useTranslation } from "react-i18next";
import { deployments, mainnetAddresses } from "@poofcash/poof-kit";
import { CHAIN_ID, RPC_URL } from "config";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { newKit } from "@celo/contractkit";
import { useStats } from "hooks/useStats";
import TornadoProxyABI from "abis/TornadoProxy.json";
import { AbiItem } from "web3-utils";
import { TornadoProxy } from "generated/TornadoProxy";

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

const LabelValue: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  return (
    <Flex
      sx={{
        alignItems: "baseline",
        mb: 2,
        justifyContent: ["auto", "space-between"],
      }}
    >
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
  const [celoPrice, setCeloPrice] = React.useState(0);
  const rCeloPrice = celoPrice / 65000;
  React.useEffect(() => {
    kit.contracts.getExchange().then((exchange) => {
      exchange
        .quoteGoldSell(oneGold)
        .then((amountCUSD) =>
          setCeloPrice(amountCUSD.toNumber() / Math.pow(10, 18))
        );
    });
  });

  const {
    totalVolume: totalCeloVolume,
    dailyVolume: dailyCeloVolume,
    volumeByDay: celoVolumeByDay,
    totalValueLocked: totalCeloLocked,
  } = useStats(celo, celoAddresses);

  const {
    totalVolume: totalRCeloVolume,
    dailyVolume: dailyRCeloVolume,
    volumeByDay: rCeloVolumeByDay,
    totalValueLocked: totalRCeloLocked,
  } = useStats(rcelo, rCeloAddresses);

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
        <LabelValue label={"rCELO/USD"} value={`$${rCeloPrice}`} />
        <LabelValue
          label={"Total rCELO volume"}
          value={`${totalRCeloVolume.toLocaleString()} rCELO / $${roundCurrency(
            totalRCeloVolume * rCeloPrice
          ).toLocaleString()}`}
        />
        <LabelValue
          label={"Past 24 hours rCELO volume"}
          value={`${dailyRCeloVolume.toLocaleString()} rCELO / $${roundCurrency(
            dailyRCeloVolume * rCeloPrice
          ).toLocaleString()}`}
        />
        <BarChart data={rCeloVolumeByDay} width={250} height={250}>
          <XAxis dataKey="label" />
          <YAxis
            width={120}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Bar dataKey="volume" fill="#7C71FD" />
        </BarChart>
        <LabelValue
          label={"Total value locked"}
          value={`${totalRCeloLocked.toLocaleString()} rCELO / $${roundCurrency(
            totalRCeloLocked * rCeloPrice
          ).toLocaleString()}`}
        />
        <Divider sx={{ my: 4 }} />
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
        <BarChart data={celoVolumeByDay} width={250} height={250}>
          <XAxis dataKey="label" />
          <YAxis />
          <Bar dataKey="volume" fill="#7C71FD" />
        </BarChart>
        <LabelValue
          label={"Total value locked"}
          value={`${totalCeloLocked} CELO / $${roundCurrency(
            totalCeloLocked * celoPrice
          ).toLocaleString()}`}
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
