const { Telegraf } = require("telegraf");
const creds = require("./creditionals.json");
const mongo_creds = require("./mongo_creds.json");
const bot_token = require("./bot_token.json");
let session = require("./login");
let db_ids = require("./sync_ids_db");
let html = require("./get_html");
let get_data = require("./get_data");
const logger = require("./logger")("main");
const last_holidays_day = new Date(
  "Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)"
);
const last_quarter_day = new Date(
  "Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)"
);
const bot = new Telegraf(bot_token.token);
const db = require("./db");
let ids = [];

bot.start((ctx) => {
  ctx.reply(
    "Привет! Этот бот поможет с электронным дневником",
    Markup.keyboard([["Войти"]])
      .oneTime()
      .resize()
      .extra()
  );
  let id = ctx.chat.id;
  //console.log(ids);
  if (!ids.includes(id)) ids.push(id);
  db_creds.sync_ids_list(ids);
  console.log(ids);
});
bot.hears("Войти", (ctx) => {
  let id = ctx.chat.id;
  if (Object.keys(creds).includes(id)) {
    ctx.reply(
      "Вы уже зарегистрированы",
      Markup.keyboard([["Назад", "Перерегистрироваться"]])
        .oneTime()
        .resize()
        .extra()
    );
  } else {
  }
});
bot.hears("*", (ctx) => {
  console.log("hmm");
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
let configure_message = (pair) => {
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
  return answ
};
let check_for_updates = async () => {
  for (let i = 0; i < ids.length; i++) {
    console.log(i)
    logger.info("chech_for_updates called");
    let cr = await session.login(creds, ids[i]);
    let id = cr[0];
    let pupil_id = cr[1];
    while (id === 0) {
      logger.info("call login() func");
      cr = await session.login(creds, ids[i]);
      id = cr[0];
      pupil_id = cr[1];
    }
    res = await get_data(
      last_holidays_day,
      last_quarter_day,
      43,
      id,
      pupil_id,
      ids[i]
    );
    while (res == 0) {
      res = await get_data(
        last_holidays_day,
        last_quarter_day,
        43,
        id,
        pupil_id,
        ids[i]
      );
    }
    session.logout(id, ids[i]);
    logger.debug(
      "result length",
      res.length,
      "res",
      JSON.stringify(res, null, 2)
    );
    res = await db.update_db(res, ids[i]);
    for (let i = 0; i < res.length; i++) {
      let pair = res[i];
      let answ = configure_message(pair);

      bot.telegram
        .sendMessage(ids[i], answ)
        .catch((e) => logger.error("error in sending message to user", e));
    }

  }
};

let init = async () => {
  ids = await db_ids();
  check_for_updates();
};
init();
bot.launch();
