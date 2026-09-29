import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Escopo destes testes: lógica de servidor (Server Actions, regras de
// negócio puras) — não componentes React. Por isso não há jsdom nem
// @testing-library/react aqui; se testes de componente forem precisos depois,
// entram como uma configuração à parte (ou um "environment" por arquivo).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
