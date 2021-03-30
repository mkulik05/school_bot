const { Telegraf } = require('telegraf');
const { Keyboard } = require('telegram-keyboard');
const mongo_url =
	'mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false';
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
});

bot.on('message', (ctx) => {
	//console.log(ctx.message.text)
	switch (ctx.message.text) {
		case 'Обновить':
			msg_update(ctx);
			break;
		case 'Главная':
			ctx.reply('Главная страница', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
			break;
		case 'Войти':
			msg_enter(ctx);
			break;
		case 'Перевойти':
			msg_reenter(ctx);
			break;
		case 'Я вошёл':
			msg_i_login(ctx);
			break;
	}
});

let send_msg = async (id, text, keyb = 0) => {
	if (keyb == 0) {
		await bot.telegram
			.sendMessage(id, text)
			.catch((e) => logger.error('error in sending message to user id=', id, e));
	} else {
		await bot.telegram
			.sendMessage(id, text, keyb)
			.catch((e) => logger.error('error in sending message to user id=', id, e));
	}
};
let msg_reenter = async (ctx) => {
	let id = ctx.chat.id;
	await send_msg(
		id,
		`Вам нужно войти в учётную запись своего дневника\n\nВнимание, войдя в свою учётную запись, Вы даёте права на использование и хранение ваших данных(telegram id, пароль и логин от учётной записи дневника)\n\nВаш регистрационный токен:`
	);
	await send_msg(id, id);
	ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
};

let msg_i_login = async (ctx) => {
	creds = await db_creds(mongo_url);
	let id = ctx.chat.id;
	if (creds != null) {
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
				await send_msg(id, 'Пароль и/или логин неверный, вам нужно перевойти\n\nВаш регистрационный токен:');
				await send_msg(id, id);
				ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
			} else {
				if (!ids.includes(id)) ids.push(id);
				db_ids(mongo_url, ids);
				ctx.reply('Вход выполнен успешно', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
			}
		}
	}
};

let msg_update = async (ctx) => {
	await send_msg(ctx.chat.id, 'Информация обрабатывается');
	let b = await check_for_updates(ctx.chat.id);
	if (!b) {
		ctx.reply('Изменений нет', Keyboard.make([ [ 'Войти', 'Обновить' ] ]).reply());
	}
};

let msg_enter = (ctx) => {
	let id = ctx.chat.id;
	if (ids.includes(id)) {
		ctx.reply('Вы уже зашли', Keyboard.make([ 'Главная', 'Перевойти' ]).reply());
	} else {
		msg_reenter(ctx);
	}
};

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
let configure_message = (pair) => {
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
		res = await db.update_db(mongo_url, res, tg_id, tg_id.toString());
		console.log(res, res.length);
		for (let i = 0; i < res.length; i++) {
			let pair = res[i];
			let answ = configure_message(pair);
			send_msg(tg_id, answ);
		}
		return res.length != 0;
	}
};

let init = async () => {
	ids = await db_ids(mongo_url);
	creds = await db_creds(mongo_url);
	for (let i = 0; i < ids.length; i++) {
		check_for_updates(ids[i]);
	}
	setInterval(() => {
		for (let i = 0; i < ids.length; i++) {
			check_for_updates(ids[i]);
		}
	}, 1000 * 60 * 5)
};

init();
bot.launch();
