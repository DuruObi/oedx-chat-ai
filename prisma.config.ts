import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    datasource: {
      url: "file:./dev.db",
    },
  },
});
