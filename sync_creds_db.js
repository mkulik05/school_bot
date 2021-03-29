const logger = require("./logger")("sync_creds_db")
// const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const url =
  "mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const dbName = "school_bot";


let get_creds = async () => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client(get_creds)");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection("creds");
    if (col == null) {
      return 0
    }

    let result = await col.findOne({});
    //logger.debug("result", result)
    return result
  } catch (err) {
    logger.error("error", err.stack);
  } finally {
    await client.close();
  }
};
module.exports = get_creds;
