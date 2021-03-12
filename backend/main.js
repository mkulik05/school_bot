let get_data = require("./get_data");
const last_holidays_day = new Date("Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)")
const last_quarter_day = new Date("Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)")
let main = async () => {
    res = await get_data.data(last_holidays_day, last_quarter_day)

    console.log(res, res.length)
    run(res).catch(console.dir);
}
const mongo_creds = require("./mongo_creds.json")
const { MongoClient } = require("mongodb");
 
// Replace the following with your Atlas connection string                                                                                                                                        
//const url = `mongodb+srv://${mongo_creds.user}:${mongo_creds.password}@cluster0.hvnia.mongodb.net/test?authSource=admin&replicaSet=atlas-zd20rv-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
const url = 'mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false'
const client = new MongoClient(url);
 
 // The database to use
 const dbName = "school_bot";
                      
 async function run(data) {
    try {
         await client.connect();
         console.log("Connected correctly to server");
         const db = client.db(dbName);

         // Use the collection "people"
         const col = db.collection("test");
         for(let i = 0; i < data.length; i++){
            let el = data[i]
            let str = Object.keys(el)[0]
            let result = await col.findOne({[str]: {$exists: true}})
            if (result == null){
               await col.insertOne(el);
               console.log("add to db")
            } else {
               if (JSON.stringify(result[str]) != JSON.stringify(el[str])){
                  await col.replaceOne({[str]: {$exists: true}}, el);
                  console.log("not eq, change")
                  // console.log(JSON.stringify(result[str]))
                  // console.log(JSON.stringify(el[str]), "\n\n")
               } else{
                  console.log("eq")
               }
            }
         }
         //await col.insertMany(data);
         //console.log(p)
         //const b = await col.find({}, {sort:{created: -1}}).limit(60);
//         console.log(b)
         // b.forEach(el =>{
         //    console.dir(el) 
         // })
        //  console.log(typeof b)
        } catch (err) {
         console.log(err.stack);
        }
 
     finally {
        await client.close();
     }
}



main()

