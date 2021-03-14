const { Telegraf } = require("telegraf");
const mongo_creds = require("./mongo_creds.json");
const bot_token = require("./bot_token.json");
const last_holidays_day = new Date(
  "Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)"
);
const last_quarter_day = new Date(
  "Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)"
);
let id = 788266160
const bot = new Telegraf(bot_token.token);
let db = require("./db")

bot.start((ctx) => {
  ctx.reply("Привет! Этот бот поможет с электронным дневником")
  console.log(ctx.chat.id)
})

let find_changes = (obj1, obj2, skip_keys = ["_id"]) => {
  // arr1 - старый, arr2 - новый
  let changes = {"hw": [], "mark": []}
  keys1 = Object.keys(obj1);
  keys2 = Object.keys(obj1);
  for (let i = 0; i < keys1.length; i++) {
    key = keys1[i];
    if (!skip_keys.includes(key)) {
    if (keys2.includes(key)) {
      if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
        if (JSON.stringify(obj1[key].mark) != JSON.stringify(obj2[key].mark)) {
          changes["mark"].push({[key]:obj2[key]})
        }
        if (JSON.stringify(obj1[key].hw) != JSON.stringify(obj2[key].hw)) {
          changes["hw"].push({[key]: obj2[key]})
        }
      }
    }
  }
  }
  return changes
}
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

let check_for_updates = async () => {
  res = await db.update_db(last_holidays_day, last_quarter_day, mongo_creds, 43)
  console.log(res, res.length)
  for(let i = 0; i < res.length; i++){

    let pair = res[i]
    let date = pair[0].date.split("-")
    let answ = date[1] + "\-" + date[2] + "\n\n"
    changes = find_changes(pair[0], pair[1])
    if (changes.mark.length > 0) {
      answ += "Новые оценки :\n"
      for (let i = 0; i < changes.mark.length; i++) {
        arr = changes.mark[i]
        answ = answ + " - " + Object.keys(arr)[0].toLowerCase() + "  " + arr[Object.keys(arr)[0]]["mark"] + "\n"
      }
      answ+= "\n"
    }
    if (changes.hw.length > 0) {
      answ += "Новое дз :\n"
      for (let i = 0; i < changes.hw.length; i++) {
        arr = changes.hw[i]
        answ = answ + " - " +Object.keys(arr)[0].toLowerCase() + "  " + arr[Object.keys(arr)[0]]["hw"] + "\n"
      }
    }
    bot.telegram.sendMessage(id, answ)
    //bot.telegram.sendMessage(id, "стало" + JSON.stringify(pair[0], null, 4))
  
  }
  // for (let i = 0; i < res.length; i++) {
  //   bot.telegram.sendMessage(id, JSON.stringify(res[i], null, 4))

  // }
}
  //console.log(res)

check_for_updates()


bot.launch();
