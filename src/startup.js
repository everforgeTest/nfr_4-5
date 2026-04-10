const HotPocket = require("hotpocket-nodejs-contract");
const bson = require("bson");
const { DBInitializer } = require("./Data.Deploy/initDB");
const { Controller } = require("./controller");
const settings = require("./settings.json").settings;

const contract = async (ctx) => {
  console.log("NFT contract is running.");

  try {
    await DBInitializer.init();
  } catch (e) {
    console.error("DB init error", e);
  }

  const controller = new Controller();

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try {
        message = JSON.parse(buf);
      } catch (e) {
        try {
          message = bson.deserialize(buf);
        } catch (e2) {
          await user.send(JSON.stringify({ error: { code: 400, message: "Invalid input format." } }));
          continue;
        }
      }
      await controller.handleRequest(user, message, ctx.readonly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract, HotPocket.clientProtocols.JSON, true);
