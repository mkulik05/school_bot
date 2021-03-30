const logger = require("./logger")("sync_creds_db")
// const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const dbName = "school_bot";


let get_creds = async (url) => {
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
    if (result == null) {
      return 0
    }
    return result
  } catch (err) {
    logger.error("error", err.stack);
    return 0
  } finally {
    await client.close();
  }
};
module.exports = get_creds;
