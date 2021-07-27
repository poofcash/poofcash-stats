import React from "react";
import { useStats } from "hooks/useStats";
import { LabelValue } from "components/LabelValue";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

interface Props {
  tokenAddress: string;
  tokenPools: [string, string][];
  tokenPriceUsd: number;
}

export const PoolStats: React.FC<Props> = ({
  tokenAddress,
  tokenPools,
  tokenPriceUsd,
}) => {
  const {
    tokenSymbol,
    totalVolume,
    dailyVolume,
    volumeByDay,
    totalValueLocked,
  } = useStats(tokenAddress, tokenPools);

  return (
    <>
      <LabelValue label={`${tokenSymbol}/USD`} value={`$${tokenPriceUsd}`} />
      <LabelValue
        label={`Total ${tokenSymbol} volume`}
        value={`${totalVolume.toLocaleString()} ${tokenSymbol} / ${(
          totalVolume * tokenPriceUsd
        ).toLocaleString(undefined, { style: "currency", currency: "USD" })}`}
      />
      <LabelValue
        label={`Past 24 hours ${tokenSymbol} volume`}
        value={`${dailyVolume.toLocaleString()} ${tokenSymbol} / ${(
          dailyVolume * tokenPriceUsd
        ).toLocaleString(undefined, { style: "currency", currency: "USD" })}`}
      />
      <BarChart data={volumeByDay} width={250} height={250}>
        <XAxis dataKey="label" />
        <YAxis width={120} tickFormatter={(value) => value.toLocaleString()} />
        <Bar dataKey="volume" fill="#7C71FD" />
      </BarChart>
      <LabelValue
        label={"Total value locked"}
        value={`${totalValueLocked.toLocaleString()} ${tokenSymbol} / ${(
          totalValueLocked * tokenPriceUsd
        ).toLocaleString(undefined, { style: "currency", currency: "USD" })}`}
      />
    </>
  );
};
