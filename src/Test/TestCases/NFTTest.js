const { assertEqual, assertSuccessResponse } = require("../test-utils");

async function runNFTLifecycleTest(client) {
  const url = process.env.CONTRACT_URL || "wss://localhost:8081";
  console.log("Running NFT lifecycle test on", url);

  // Mint
  const mintReq = { Service: "NFT", Action: "MintNFT", data: { name: "Test NFT", metadata: { rarity: "common" } } };
  const mintInput = Buffer.from(JSON.stringify(mintReq));
  await client.submitContractInput(mintInput);

  // Read back list by owner may take a non-readonly round; give a small delay
  await new Promise(r => setTimeout(r, 1000));

  const ownerHex = Buffer.from(client.keys.publicKey).toString("hex");
  const listRespRaw = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: "NFT", Action: "ListNFTsByOwner", data: { ownerPubKey: ownerHex } })));
  const listResp = JSON.parse(listRespRaw);
  assertSuccessResponse(listResp);
  const items = listResp.success || [];
  if (!items.length) throw new Error("Expected at least one NFT owned by current user.");
  const tokenId = items[0].tokenId;

  // Get by TokenId
  const getRespRaw = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: "NFT", Action: "GetNFTByTokenId", data: { tokenId } })));
  const getResp = JSON.parse(getRespRaw);
  assertSuccessResponse(getResp);
  assertEqual(getResp.success.tokenId, tokenId, "TokenId should match");

  console.log("NFT lifecycle test passed.");
}

module.exports = { runNFTLifecycleTest };
