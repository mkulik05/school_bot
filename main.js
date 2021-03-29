const { Telegraf } = require('telegraf');
const { Keyboard } = require('telegram-keyboard');

//const creds = require("./creditionals.json");
const mongo_creds = require('./mongo_creds.json');
const bot_token = require('./bot_token.json');
let session = require('./login');
let db_ids = require('./sync_ids_db');
let db_creds = require('./sync_creds_db');
let get_data = require('./get_data');
const logger = require('./logger')('main');
const last_holidays_day = new Date('Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)');
const last_quarter_day = new Date('Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)');
const bot = new Telegraf(bot_token.token);
const db = require('./db');
let ids = [];
let creds = {};
bot.start((ctx) => {
	ctx.reply('Привет! Этот бот поможет с электронным дневником', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
	// let id = ctx.chat.id;
	// console.log(ids);
	// if (!ids.includes(id)) ids.push(id);
	// db_ids(ids);
	// console.log(ids);
});

let send_msg = async(id, text, keyb = 0) => {
  if (keyb == 0) {
    await bot.telegram.sendMessage(id, text).catch((e) => logger.error('error in sending message to user id=',id, e));
  } else {
    await bot.telegram.sendMessage(id, text, keyb).catch((e) => logger.error('error in sending message to user id=',id, e));
  }
} 
bot.hears('Перевойти', async (ctx) => {
	let id = ctx.chat.id;
	await send_msg(
		id,
		`Вам нужно войти в учётную запись своего дневника\n\nВнимание, войдя в свою учётную запись, даёте права на использование ваших данных(telegram id, пароль, логин)\n\nВаш регистрационный токен:`
	);
	await send_msg(id, id);
	ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
});
bot.hears('Я вошёл', async (ctx) => {
	creds = await db_creds();
	let id = ctx.chat.id;
	let his_creds = creds[id.toString()];
	if (typeof his_creds == 'undefined') {
		await send_msg(
			id,
			`Вас нет в базе данных, вам нужно войти в свою учётную запись\n\nВаш регистрационный токен:`
		);
		await send_msg(id, id);
		ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
	} else {
		let res = await session.login(his_creds, id);
		session.logout(his_creds, id);
		if (res == -1) {
			await send_msg(
				id,
				'Пароль и/или логин неверный, вам нужно перевойти\n\nВаш регистрационный токен:'
			);
			await send_msg(id, id);
			ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
		} else {
			if (!ids.includes(id)) ids.push(id);
			db_ids(ids);
			ctx.reply('Вход выполнен успешно', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
		}
	}
	bot.hears('Обновить', async (ctx) => {
		console.log('Обновить');
		let b = await check_for_updates(ctx.chat.id);
		if (!b) {
			ctx.reply('Изменений нет', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
		}
	});

	// send_msg(id, `Вам нужно войти в учётную запись своего дневника\n\nВнимание, войдя в свою учётную запись, даёте права на использование ваших данных(telegram id, пароль, логин)\n\nВаш регистрационный токен:`)
	// send_msg(id, id)
	// ctx.reply(
	//   `Страница входа: `+"https://google.com",
	//   Keyboard.make(["Я вошёл"]).reply()
	// );
});
bot.hears('Главная', (ctx) => {
	ctx.reply('Изменений нет', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
});
bot.hears('Войти', async (ctx) => {
	let id = ctx.chat.id;
	if (ids.includes(id)) {
		ctx.reply('Вы уже зашли', Keyboard.make([ 'Главная', 'Перевойти' ]).reply());
	} else {
		await send_msg(
			id,
			`Вам нужно войти в учётную запись своего дневника\n\nВнимание, войдя в свою учётную запись,Вы даёте права на использование ваших данных(telegram id, пароль, логин)\n\nВаш регистрационный токен:`
		);
		await send_msg(id, id);
		ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
	}
});

let find_changes = (obj1, obj2, skip_keys = [ '_id' ]) => {
	// arr1 - старый, arr2 - новый
	logger.info('fund_changes func called');
	logger.debug('obj1', JSON.stringify(obj1, null, 2), 'obj2', JSON.stringify(obj2, null, 2));
	let changes = { hw: [], mark: [] };
	try {
		let keys1 = Object.keys(obj1);
		let keys2 = Object.keys(obj1);
		let key = '';
		for (let i = 0; i < keys1.length; i++) {
			key = keys1[i];
			if (!skip_keys.includes(key)) {
				if (keys2.includes(key)) {
					if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
						if (JSON.stringify(obj1[key].mark) != JSON.stringify(obj2[key].mark)) {
							changes['mark'].push({ [key]: obj2[key] });
						}
						if (JSON.stringify(obj1[key].hw) != JSON.stringify(obj2[key].hw)) {
							changes['hw'].push({ [key]: obj2[key] });
						}
					}
				}
			}
		}
	} catch (e) {
		logger.error('error in fund_changes func', e);
	}
	logger.debug('obj1', JSON.stringify(obj1, null, 2), 'obj2', JSON.stringify(obj2, null, 2), 'result:', changes);
	return changes;
};
bot.help((ctx) => ctx.reply("I'm alive"));
// bot.on("sticker", (ctx) => ctx.reply("👍"));
// bot.hears("hi", (ctx) => ctx.reply("Hey there"));
let configure_message = (pair) => {
	//console.log(pair)
	let date = pair[0].date.split('-');
	let answ = date[1] + '-' + date[2] + '\n\n';
	let changes = find_changes(pair[0], pair[1]);
	let arr;
	if (changes.mark.length > 0) {
		answ += 'Новые оценки :\n';
		for (let i = 0; i < changes.mark.length; i++) {
			arr = changes.mark[i];
			answ = answ + ' - ' + Object.keys(arr)[0].toLowerCase() + '  ' + arr[Object.keys(arr)[0]]['mark'] + '\n';
		}
		answ += '\n';
	}
	if (changes.hw.length > 0) {
		answ += 'Новое дз :\n';
		for (let i = 0; i < changes.hw.length; i++) {
			arr = changes.hw[i];
			answ = answ + ' - ' + Object.keys(arr)[0].toLowerCase() + '  ' + arr[Object.keys(arr)[0]]['hw'] + '\n';
		}
	}
	return answ;
};
let check_for_updates = async (tg_id) => {
	logger.info('chech_for_updates called');
	let cr = await session.login(creds[tg_id.toString()], tg_id);
	// console.log(cr)
	if (cr == -1) {
		send_msg(tg_id, 'Вам нужно перевойти');
	} else {
		let id = cr[0];
		let pupil_id = cr[1];
		while (id === 0) {
			logger.info('call login() func');
			cr = await session.login(creds, tg_id);
			id = cr[0];
			pupil_id = cr[1];
		}
		let res = await get_data(last_holidays_day, last_quarter_day, 43, id, pupil_id, tg_id);
		while (res == 0) {
			res = await get_data(last_holidays_day, last_quarter_day, 43, id, pupil_id, tg_id);
		}
		session.logout(id, tg_id);
		logger.debug('result length', res.length, 'res', JSON.stringify(res, null, 2));
		res = await db.update_db(res, tg_id, tg_id.toString());
		console.log(res, res.length);
		for (let i = 0; i < res.length; i++) {
			let pair = res[i];
			let answ = configure_message(pair);
			send_msg(tg_id, answ)		}
		return res.length != 0;
	}
};

let init = async () => {
	ids = await db_ids();
	creds = await db_creds();
	//console.log(creds, ids)
	for (let i = 0; i < ids.length; i++) {
		check_for_updates(ids[i]);
	}
};
init();
bot.launch();
