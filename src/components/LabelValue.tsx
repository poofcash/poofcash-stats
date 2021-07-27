import React from "react";
import { Flex, Text } from "theme-ui";

export const LabelValue: React.FC<{ label: string; value: string }> = ({
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
