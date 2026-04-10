const HotPocket = require("hotpocket-js-client");
const bson = require("bson");

class ContractService {
  constructor(servers, keyPair) {
    this.servers = servers;
    this.userKeyPair = keyPair;
    this.client = null;
    this.isConnected = false;
    this.promiseMap = new Map();
  }

  async init() {
    if (!this.userKeyPair) this.userKeyPair = await HotPocket.generateKeys();
    if (!this.client) {
      this.client = await HotPocket.createClient(this.servers, this.userKeyPair, { protocol: HotPocket.protocols.bson });
    }

    this.client.on(HotPocket.events.disconnect, () => {
      this.isConnected = false;
    });

    this.client.on(HotPocket.events.connectionChange, (server, action) => {
      console.log(server + " " + action);
    });

    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        let output;
        try { output = bson.deserialize(o); } catch (_) { try { output = JSON.parse(o.toString()); } catch (__) { output = { error: { message: "Invalid output" } }; } }
        const pId = output.promiseId;
        if (pId && this.promiseMap.has(pId)) {
          const ctx = this.promiseMap.get(pId);
          if (output.error) ctx.rejecter(output.error);
          else ctx.resolver(output.success || output);
          this.promiseMap.delete(pId);
        }
      });
    });

    if (!this.isConnected) {
      if (!(await this.client.connect())) {
        console.log("Connection failed.");
        return false;
      }
      console.log("HotPocket Connected.");
      this.isConnected = true;
    }
    return true;
  }

  submitInput(inp) {
    const promiseId = Math.random().toString(16).slice(2);
    const payload = bson.serialize({ promiseId, ...inp });
    this.client.submitContractInput(payload).then((input) => {
      input?.submissionStatus.then((s) => {
        if (s.status !== "accepted") console.log(`Ledger_Rejection: ${s.reason}`);
      });
    });
    return new Promise((resolve, reject) => {
      this.promiseMap.set(promiseId, { resolver: resolve, rejecter: reject });
    });
  }
}

module.exports = ContractService;
