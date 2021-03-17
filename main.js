const { Telegraf } = require("telegraf");
const creds = require("./creditionals.json");
const mongo_creds = require("./mongo_creds.json");
const bot_token = require("./bot_token.json");
const logger = require("./logger")("main");
const last_holidays_day = new Date(
  "Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)"
);
const last_quarter_day = new Date(
  "Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)"
);
const bot = new Telegraf(bot_token.token);
const db = require("./db");
let id = 788266160;

bot.start((ctx) => {
  ctx.reply("Привет! Этот бот поможет с электронным дневником");
  console.log(ctx.chat.id);
});

let find_changes = (obj1, obj2, skip_keys = ["_id"]) => {
  // arr1 - старый, arr2 - новый
  logger.info("fund_changes func called");
  logger.debug(
    "obj1",
    JSON.stringify(obj1, null, 2),
    "obj2",
    JSON.stringify(obj2, null, 2)
  );
  let changes = { hw: [], mark: [] };
  try {
    keys1 = Object.keys(obj1);
    keys2 = Object.keys(obj1);
    for (let i = 0; i < keys1.length; i++) {
      key = keys1[i];
      if (!skip_keys.includes(key)) {
        if (keys2.includes(key)) {
          if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
            if (
              JSON.stringify(obj1[key].mark) != JSON.stringify(obj2[key].mark)
            ) {
              changes["mark"].push({ [key]: obj2[key] });
            }
            if (JSON.stringify(obj1[key].hw) != JSON.stringify(obj2[key].hw)) {
              changes["hw"].push({ [key]: obj2[key] });
            }
          }
        }
      }
    }
  } catch (e) {
    logger.error("error in fund_changes func", e);
  }
  logger.debug(
    "obj1",
    JSON.stringify(obj1, null, 2),
    "obj2",
    JSON.stringify(obj2, null, 2),
    "result:",
    changes
  );
  return changes;
};
bot.help((ctx) => ctx.reply("I'm alive"));
// bot.on("sticker", (ctx) => ctx.reply("👍"));
// bot.hears("hi", (ctx) => ctx.reply("Hey there"));

let check_for_updates = async () => {
  logger.info("chech_for_updates called")
  res = await db.update_db(
    creds,
    last_holidays_day,
    last_quarter_day,
    mongo_creds,
    43
  );
  logger.debug("result length", res.length, "res", JSON.stringify(res, null, 2))
  //console.log(res, res.length);
  for (let i = 0; i < res.length; i++) {
    let pair = res[i];
    let date = pair[0].date.split("-");
    let answ = date[1] + "-" + date[2] + "\n\n";
    changes = find_changes(pair[0], pair[1]);
    if (changes.mark.length > 0) {
      answ += "Новые оценки :\n";
      for (let i = 0; i < changes.mark.length; i++) {
        arr = changes.mark[i];
        answ =
          answ +
          " - " +
          Object.keys(arr)[0].toLowerCase() +
          "  " +
          arr[Object.keys(arr)[0]]["mark"] +
          "\n";
      }
      answ += "\n";
    }
    if (changes.hw.length > 0) {
      answ += "Новое дз :\n";
      for (let i = 0; i < changes.hw.length; i++) {
        arr = changes.hw[i];
        answ =
          answ +
          " - " +
          Object.keys(arr)[0].toLowerCase() +
          "  " +
          arr[Object.keys(arr)[0]]["hw"] +
          "\n";
      }
    }
      bot.telegram.sendMessage(id, answ).catch((e)=>logger.error("error in sending message to user", e));;
    //bot.telegram.sendMessage(id, "стало" + JSON.stringify(pair[0], null, 4))
  }
  // for (let i = 0; i < res.length; i++) {
  //   bot.telegram.sendMessage(id, JSON.stringify(res[i], null, 4))

  // }
};
//console.log(res)
setInterval(() => {
  check_for_updates();
}, 1000 * 60 * 10);
check_for_updates();
bot.launch();
