import React from "react";
import { Container } from "theme-ui";
import { Logo } from "components/Logo";

export const Header: React.FC = () => {
  return (
    <>
      <Container sx={{ width: "auto" }}>
        <Logo />
      </Container>
    </>
  );
};
