let get_data = require("./get_data");

let objs_are_simple = (obj1, obj2, skip_keys = ["_id"]) => {
  keys1 = Object.keys(obj1);
  keys2 = Object.keys(obj1);
  for (let i = 0; i < keys1.length; i++) {
    key = keys1[i];
    if (keys2.includes(key)) {
      if (!skip_keys.includes(key)) {
        if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
          return false;
        }
      }
    }
  }
  return true;
};

let main = async (
  last_holidays_day,
  last_quarter_day,
  mongo_creds,
  quarter_key = 43
) => {
  res = await get_data.data(last_holidays_day, last_quarter_day, quarter_key);

  console.log(res, res.length);
  return await run(res).catch(console.dir);
};
const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");

//const url = `mongodb+srv://${mongo_creds.user}:${mongo_creds.password}@cluster0.hvnia.mongodb.net/test?authSource=admin&replicaSet=atlas-zd20rv-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
const url =
  "mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const client = new MongoClient(url, { useUnifiedTopology: true });

const dbName = "school_bot";

let run = async (data) => {
  let changes = [];
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const db = client.db(dbName);

    const col = db.collection("test");
    for (let i = 0; i < data.length; i++) {
      let el = data[i];
      let str = el["date"];
      if (typeof str == "undefined") {
        let result = await col.findOne({
          [Object.keys(el)[0]]: { $exists: true },
        });
        if (result == null) {
          await col.insertOne(el);
          console.log("add to db");
        } else {
          console.log(
            JSON.stringify(result[Object.keys(el)[0]]),
            JSON.stringify(el[Object.keys(el)[0]])
          );
          if (
            JSON.stringify(result[Object.keys(el)[0]]) !=
            JSON.stringify(el[Object.keys(el)[0]])
          ) {
            await col.replaceOne(
              { [Object.keys(el)[0]]: { $exists: true } },
              el
            );
            console.log("not eq, change");
          } else {
            console.log("eq");
          }
        }
      } else {
        let result = await col.findOne({ date: str });
        //console.log(result);
        if (result == null) {
          await col.insertOne(el);
          changes.push(el);
          console.log("add to db");
        } else {
          //console.log(str, result)
          //console.log(JSON.stringify(result), JSON.stringify(el), JSON.stringify(result) == JSON.stringify(el));
          if (!objs_are_simple(result, el)) {
            await col.replaceOne({ date: str }, el);
            console.log("not eq, changesssss");
            changes.push(el);
          } else {
            console.log("eq");
          }
        }
      }
    }
  } catch (err) {
    console.log(err.stack);
  } finally {
    await client.close();
    return changes;
  }
};

module.exports.update_db = main;
