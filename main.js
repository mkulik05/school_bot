let get_data = require("./get_data");
const last_holidays_day = new Date("Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)")
const last_quarter_day = new Date("Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)")
let main = async () => {
    res = await get_data.data(last_holidays_day, last_quarter_day)

    console.log(res, res.length)
    run(res).catch(console.dir);
}

const { MongoClient } = require("mongodb");
 
// Replace the following with your Atlas connection string                                                                                                                                        
const url = "mongodb+srv://mkulik05:SfjB-u4JxARJ-%21.@cluster0.hvnia.mongodb.net/test?authSource=admin&replicaSet=atlas-zd20rv-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true";
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

         await col.insertMany(data);
         //console.log(p)
         const b = await col.findOne({}, {sort:{created: -1}});
         console.log(b)
        //  b.forEach(el =>{
        //     console.log(el["created"]) 
        //  })
        //  console.log(typeof b)
        } catch (err) {
         console.log(err.stack);
        }
 
     finally {
        await client.close();
     }
}



main()

