// openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "openapi.yaml",
  output: "src/types",
  // Configure plugins to only export types
  plugins: [
    {
      name: "@hey-api/typescript",
      // Optional: customize type formatting if needed
      enums: "typescript", // or 'typescript'
    },
  ],
});
