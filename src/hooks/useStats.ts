import React from "react";
import moment from "moment";
import ERC20_ABI from "abis/erc20.json";
import { network } from "connectors";
import { useWeb3React } from "@web3-react/core";
import { NetworkContextName } from "index";
import { getDeposits } from "hooks/readContract";
import { newKit } from "@celo/contractkit";
import { RPC_URL } from "config";
import { fromWei, AbiItem } from "web3-utils";
import { Erc20 } from "generated/erc20";

type DailyVolume = {
  label: string;
  volume: number;
};

const getVolume = async (
  addresses: Array<[string, string]>,
  depositEvents: Array<[Array<any>, Array<any>]>,
  fromTimestamp: number,
  toTimestamp: number
) => {
  if (depositEvents.length === 0) {
    return 0;
  }
  return addresses.reduce((acc, [amt], idx) => {
    const volume =
      Number(amt) *
      depositEvents[idx][1].filter(
        (event) =>
          fromTimestamp <= event.timestamp && event.timestamp <= toTimestamp
      ).length;
    return acc + volume;
  }, 0);
};

const getUniqueUsers = async (
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
  return txns.reduce((acc, curr) => ({ ...acc, [curr.from]: true }), {});
};

const kit = newKit(RPC_URL);
export const useStats = (
  currencyAddress: string,
  addresses: Array<[string, string]>
) => {
  const token = (new kit.web3.eth.Contract(
    ERC20_ABI as AbiItem[],
    currencyAddress
  ) as unknown) as Erc20;

  const { activate: activateNetwork, library } = useWeb3React(
    NetworkContextName
  );
  React.useEffect(() => {
    if (!library) {
      activateNetwork(network);
    }
  }, [library, activateNetwork]);

  const [totalVolume, setTotalVolume] = React.useState(0);
  const [dailyVolume, setDailyVolume] = React.useState(0);
  const [volumeByDay, setVolumeByDay] = React.useState<Array<DailyVolume>>([]);

  const [uniqueUsers, setUniqueUsers] = React.useState(0);

  const [totalValueLocked, setTotalValueLocked] = React.useState(0);

  const [allDeposits, setAllDeposits] = React.useState<
    Array<[Array<any>, Array<any>]>
  >([]);
  React.useEffect(() => {
    Promise.all(
      addresses.map(([_, address]) => getDeposits(library, address))
    ).then(setAllDeposits);
  }, [library, addresses]);

  React.useEffect(() => {
    Promise.all(
      Object.values(addresses).map(([_, address]) =>
        token.methods.balanceOf(address).call()
      )
    ).then((balances) => {
      const tvl = balances
        .map((amountCGLD) => fromWei(amountCGLD.toString()))
        .reduce((acc, curr) => {
          return acc + Number(curr);
        }, 0);
      setTotalValueLocked(tvl);
    });

    const now = moment.utc().valueOf() / 1000;
    getVolume(addresses, allDeposits, 0, now).then(setTotalVolume);
    getVolume(
      addresses,
      allDeposits,
      moment.utc().add(-24, "hours").valueOf() / 1000,
      now
    ).then(setDailyVolume);
    Promise.all(
      Array(7)
        .fill(0)
        .map((_, idx) => {
          return getVolume(
            addresses,
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
      setVolumeByDay(
        dailyVolumes.map((dailyVolume, idx) => ({
          label: `-${idx + 1} day${idx === 0 ? "" : "s"}`,
          volume: dailyVolume,
        }))
      );
    });

    getUniqueUsers(allDeposits).then(setUniqueUsers);
  }, [allDeposits, addresses, token.methods]);

  return {
    totalVolume,
    dailyVolume,
    volumeByDay,
    uniqueUsers,
    totalValueLocked,
  };
};
