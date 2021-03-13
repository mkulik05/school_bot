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

bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on("sticker", (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

let check_for_updates = async () => {
  res = await db.update_db(last_holidays_day, last_quarter_day, mongo_creds, 43)
  for (let i = 0; i < res.length; i++) {
    bot.telegram.sendMessage(id, res[i])

  }
  //console.log(res)
}
setInterval(()=> {
  check_for_updates()
}, 30000)

bot.launch();
