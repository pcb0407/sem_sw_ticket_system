export default {
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.ts"],
    pool: "threads",
  },
};
