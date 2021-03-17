let get_data = require("./get_data");
const logger = require("./logger")("database")
const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
//const url = `mongodb+srv://${mongo_creds.user}:${mongo_creds.password}@cluster0.hvnia.mongodb.net/test?authSource=admin&replicaSet=atlas-zd20rv-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
const url =
  "mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const dbName = "school_bot";

let objs_are_simple = (obj1, obj2, skip_keys = ["_id"]) => {
  logger.info("function objs_are_simple called")
  logger.debug("obj1", JSON.stringify(obj1, null, 2), "obj2", JSON.stringify(obj2, null, 2))
  keys1 = Object.keys(obj1);
  keys2 = Object.keys(obj1);
  for (let i = 0; i < keys1.length; i++) {
    key = keys1[i];
    if (keys2.includes(key)) {
      if (!skip_keys.includes(key)) {
        if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
          logger.info("objects are not equal")
          return false;
        }
      }
    }
  }
  logger.info("objects are equal")
  return true;
};

let main = async (
  creds,
  last_holidays_day,
  last_quarter_day,
  mongo_creds,
  quarter_key = 43
) => {
  logger.info("called main funtion")
  logger.debug(`last_holidays_day = ${last_holidays_day}, last_quarter_day = ${last_quarter_day}, quarter_key = ${quarter_key}`)
  res = await get_data.data(creds, last_holidays_day, last_quarter_day, quarter_key);
  logger.debug("result length =", res.length)
  //console.log(res, res.length);
  try {
    return await update_db(res)
  } catch(e) {
    logger.error("error in func update_db", e)
  };
};

let update_db = async (data, col_name = "test") => {
  logger.info("called function update_db")
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client")
  let changes = [];
  try {
    await client.connect();
    logger.info("Connected correctly to server");
    const db = client.db(dbName);

    const col = db.collection(col_name);
    logger.debug("connect to collection", col_name, "data length =", data.length);
    for (let i = 0; i < data.length; i++) {
      let el = data[i];
      let str = el["date"];
      logger.info("day", i)
      logger.debug("current element ", JSON.stringify(el, null, 2), "date(str) -", str)
      if (typeof str == "undefined") {
        logger.info("element is not a day(it is additonal material)")
        let result = await col.findOne({
          [Object.keys(el)[0]]: { $exists: true },
        });
        logger.debug("additional material result", JSON.stringify(result, null, 2))
        if (result == null) {
          await col.insertOne(el);
          //console.log("add to db");
          logger.info("add to db")
        } else {
          // console.log(
          //   JSON.stringify(result[Object.keys(el)[0]]),
          //   JSON.stringify(el[Object.keys(el)[0]])
          // );
          if (
            JSON.stringify(result[Object.keys(el)[0]]) !=
            JSON.stringify(el[Object.keys(el)[0]])
          ) {
            await col.replaceOne(
              { [Object.keys(el)[0]]: { $exists: true } },
              el
            );
            logger.info("replace this data")
            //console.log("not eq, change");
          } 
        }
      } else {


        let result = await col.findOne({ date: str });
        logger.debug("res after search ob day in db", JSON.stringify(result, null, 2))
        //console.log(result);
        if (result == null) {
          logger.info("add this day to db")
          await col.insertOne(el);
          changes.push([{}, el]);
          //console.log("add to db");
        } else {
          //console.log(str, result)
          //console.log(JSON.stringify(result), JSON.stringify(el), JSON.stringify(result) == JSON.stringify(el));
          if (!objs_are_simple(result, el)) {
            //console.log(JSON.stringify(result, null, 4), JSON.stringify(el, null, 4))
            changes.push([result, el]);
            await col.replaceOne({ date: str }, el);
            logger.info("replace this day's data")
            //console.log("not eq, changesssss");
          } else {
            logger.info("days are simple")
          }
        }
      }
    }
  } catch (err) {
    console.log(err.stack);
    logger.error("error", err.stack)
  } finally {
    await client.close();
    return changes;
  }
};
module.exports.update_db = main;
