const HotPocket = require("hotpocket-js-client");

async function createClient(url) {
  const userKeyPair = await HotPocket.generateKeys();
  const client = await HotPocket.createClient([url], userKeyPair);
  if (!await client.connect()) throw new Error("Connection failed.");
  return client;
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`Assertion failed: ${msg} (${a} !== ${b})`);
}

function assertSuccessResponse(obj) {
  if (!obj || !obj.success) throw new Error("Expected success response.");
}

function assertErrorResponse(obj) {
  if (!obj || !obj.error) throw new Error("Expected error response.");
}

module.exports = { createClient, assertEqual, assertSuccessResponse, assertErrorResponse };
