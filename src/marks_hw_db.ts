import {create_log} from "./logger"
const logger = create_log("get_marks_db")
// const mongo_creds = require("./mongo_creds.json");
import { MongoClient } from "mongodb";
const dbName = "school_bot";


let get_marks_hw = async (url: string, id: string, subj: string, start: Date, end: Date, is_mark: boolean) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection(id.toString());
    if (col == null) {
      return []
    }
    let resp: Array<[string, number]> = []
    let result = await col.find({date: {$exists: true}});
    //console.log(typeof result)
    if (result == null) {
      return []
    }
    let req_key = is_mark ? "mark" : "hw" 
    await result.forEach((el)=>{
      if (new Date(el.date) > new Date(start) && new Date(el.date) < new Date(end) || el.date === start || el.date === end) {
        let keys = Object.keys(el)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]
          if (key.includes(subj)) {
            if (is_mark === true && el[key][req_key] > 0 || is_mark === false && el[key][req_key] != '') {
              resp.push([el.date, el[key][req_key]])
            }
          }
        }
      }
    });
    logger.debug("marks", JSON.stringify(resp));
    return resp
  } catch (err) {
    logger.error("error", err.stack);
    return [0,0,0]
  } finally {
    await client.close();
  }
};
export {get_marks_hw};
 