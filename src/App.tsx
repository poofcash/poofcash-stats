import React from "react";
import { Container, Flex, Text, Divider } from "theme-ui";
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
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const kit = newKit(RPC_URL);
const oneGold = kit.web3.utils.toWei("1", "ether");
const tornadoAddresses: Array<[string, string]> = Object.entries(
  instances[`netId${CHAIN_ID}`]["celo"]["instanceAddress"]
);

const getCeloVolume = async (
  depositEvents: Array<[Array<any>, Array<any>]>,
  fromTimestamp: number,
  toTimestamp: number
) => {
  if (depositEvents.length === 0) {
    return 0;
  }
  return tornadoAddresses.reduce((acc, [amt], idx) => {
    const volume =
      Number(amt) *
      depositEvents[idx][1].filter(
        (event) =>
          fromTimestamp <= event.timestamp && event.timestamp <= toTimestamp
      ).length;
    return acc + volume;
  }, 0);
};

const getNumUniqueUsers = async (
  depositEvents: Array<[Array<any>, Array<any>]>
) => {
  if (depositEvents.length === 0) {
    return 0;
  }
  const txns = await Promise.all(
    depositEvents
      .map((arr) => arr[0])
      .flat()
      .map((event) => event.getTransactionReceipt())
  );
  return Object.keys(
    txns.reduce((acc, curr) => ({ ...acc, [curr.from]: true }), {})
  ).length;
};

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

type DailyVolume = {
  label: string;
  volume: number;
};

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
  const [celoVolumeByDay, setCeloVolumeByDay] = React.useState<
    Array<DailyVolume>
  >([]);

  const [numUniqueUsers, setNumUniqueUsers] = React.useState(0);

  const [totalValueLocked, setTotalValueLocked] = React.useState(0);

  const [allDeposits, setAllDeposits] = React.useState<
    Array<[Array<any>, Array<any>]>
  >([]);
  React.useEffect(() => {
    Promise.all(
      tornadoAddresses.map(([_, address]) => getDeposits(library, address))
    ).then(setAllDeposits);
  }, [library]);

  React.useEffect(() => {
    kit.contracts.getExchange().then((exchange) => {
      exchange
        .quoteGoldSell(oneGold)
        .then((amountCUSD) =>
          setCeloPrice(amountCUSD.toNumber() / Math.pow(10, 18))
        );
    });
    kit.contracts.getGoldToken().then((token) => {
      Promise.all(
        Object.values(tornadoAddresses).map(([_, address]) =>
          token.balanceOf(address)
        )
      ).then((balances) => {
        const tvl = balances
          .map((amountCGLD) => amountCGLD.toNumber() / Math.pow(10, 18))
          .reduce((acc, curr) => {
            return acc + curr;
          }, 0);
        setTotalValueLocked(tvl);
      });
    });

    const now = moment.utc().valueOf() / 1000;
    getCeloVolume(allDeposits, 0, now).then(setTotalCeloVolume);
    getCeloVolume(
      allDeposits,
      moment.utc().add(-24, "hours").valueOf() / 1000,
      now
    ).then(setDailyCeloVolume);
    Promise.all(
      Array(7)
        .fill(0)
        .map((_, idx) => {
          return getCeloVolume(
            allDeposits,
            moment
              .utc()
              .add(-24 * (idx + 1), "hours")
              .valueOf() / 1000,
            moment
              .utc()
              .add(-24 * idx, "hours")
              .valueOf() / 1000
          );
        })
    ).then((dailyVolumes) => {
      setCeloVolumeByDay(
        dailyVolumes.map((dailyVolume, idx) => ({
          label: `-${idx + 1} day${idx === 0 ? "" : "s"}`,
          volume: dailyVolume,
        }))
      );
    });

    getNumUniqueUsers(allDeposits).then(setNumUniqueUsers);
  }, [allDeposits]);

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
        <LabelValue label={"CELO/USD"} value={`$${roundCurrency(celoPrice)}`} />
        <Divider sx={{ my: 4 }} />
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
        <Divider sx={{ my: 4 }} />
        <LabelValue
          label={"Number of unique wallets"}
          value={`${numUniqueUsers.toLocaleString()} wallets`}
        />
        <Divider sx={{ my: 4 }} />
        <LabelValue
          label={"Total value locked"}
          value={`${totalValueLocked} CELO / $${roundCurrency(
            totalValueLocked * celoPrice
          ).toLocaleString()}`}
        />
      </Container>
    </Container>
  );
};

export default App;
