const { createClient } = require("./test-utils");
const { runNFTLifecycleTest } = require("./TestCases/NFTTest");

(async () => {
  const url = process.env.CONTRACT_URL || "wss://localhost:8081";
  const client = await createClient(url);
  try {
    await runNFTLifecycleTest(client);
    console.log("All tests passed.");
  } catch (e) {
    console.error("Tests failed:", e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
