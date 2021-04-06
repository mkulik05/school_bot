import { Telegraf } from 'telegraf';
// @ts-ignore
import * as Calendar from 'telegraf-calendar-telegram';
const { Keyboard, Key } = require('telegram-keyboard');
let bot_token = require('../configs/bot_token.json');
import { login, logout } from './login';
import { get_ids as db_ids } from './sync_ids_db';
import { get_creds as db_creds } from './sync_creds_db';
import { get_data } from './get_data';
import { get_lessons as lessons } from './get_les_db';
import { get_marks as marks } from './marks_db';
import { update_db } from './db';
import { create_log } from './logger';
const logger = create_log('main');

const last_holidays_day = new Date('Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)');
const last_quarter_day = new Date('Fri Mar 28 2021 23:59:59 GMT+0300 (Moscow Standard Time)');
const bot = new Telegraf(bot_token.token);
const calendar = new Calendar(bot
// 	,
// 	 {
// 	startWeekDay: 1,
// 	weekDayNames: [ 'M', 'T', 'W', 'T', 'F', 'S', 'S' ],
// 	monthNames: [ 'Jan', 'Feb', 'Mar', 'Apr', 'Mar', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Nov', 'Dec' ]
// }
);
let mongo_url = '';
const args = process.argv;
if (args[args.length - 1] == 'server') {
	console.log('server mode');
	const m_creds = require('../configs/mongo_creds.json');
	mongo_url = `mongodb://${m_creds.user}:${m_creds.password}@40.90.237.194:27017/school_bot?authSource=school_bot&readPreference=primary&gssapiServiceName=mongodb&appname=MongoDB%20Compass%20Beta&ssl=false`;
} else {
	console.log('test mode');
	mongo_url =
		'mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false';
}

let ids: Array<string> = [];
let creds = {};
let subj_requests = {};
let req_periods = {};

bot.start((ctx) => {
	ctx.reply(
		'Привет! Этот бот поможет с электронным дневником',
		Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply()
	);
});

calendar.setDateListener((ctx, date) => {
	// console.log(JSON.stringify(ctx, null, 2))
	// console.log("\n\n", Object.keys(ctx.update))
	// console.log("\n\n", Object.keys(ctx.update.callback_query))
	let id = ctx.chat.id.toString();
	// console.log(req_periods[id]["msg_ids"])
	// console.log(ctx.update.callback_query.message)
	// console.log(ctx.update.callback_query.message.message_id)
	let msg_id =ctx.update.callback_query.message.message_id
	let ind = req_periods[id]["msg_ids"].indexOf(msg_id)
	console.log(ind)
	if (Object.keys(req_periods).includes(id)) {
		if (!Object.keys(req_periods[id]).includes("periods")) {
			req_periods[id]["periods"] = ['', '']
		}
		if (req_periods[id]["periods"][ind] == '') {
			req_periods[id]["periods"][ind] = date;
		}
	} else {
		req_periods[id] = {}
		req_periods[id]["periods"] = [ '', '' ];
		req_periods[id]["periods"][ind] = date
	}
	console.log(req_periods)
	ctx.deleteMessage();
});

const today = new Date();
const minDate = new Date();
minDate.setMonth(today.getMonth() - 2);
const maxDate = new Date();
maxDate.setMonth(today.getMonth() + 2);
maxDate.setDate(today.getDate());

bot.on('text', async (ctx) => {
	switch (ctx.message.text) {
		case 'Обновить':
			msg_update(ctx);
			break;
		case 'Главная':
			ctx.reply('Главная страница', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
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
		case 'Отметки':
			msg_marks(ctx);
			break;
		case 'Узнать отметки':
			get_dates(ctx);
			break;
	}
});

// let wait_date = (id, e) => {
// 	return new Promise((resolve, reject) => {
// 		let state1 = '';
// 		let state2 = '';
// 		setTimeout(() => {
// resolve(1)
// 		}, 10000)

// 	})
// };

let get_dates=(ctx) =>{
	let id = ctx.chat.id.toString();
	if (Object.keys(req_periods).includes(id)) { 
		if (req_periods[id]["periods"][0] == '') ctx.reply('Вы не выбрали начальную дату');
		if (req_periods[id]["periods"][1] == '') ctx.reply('Вы не выбрали конечную дату');
		if(req_periods[id]["periods"][0] != '' && req_periods[id]["periods"][1] != '') {
			get_marks_list(ctx, new Date(req_periods[id]["periods"][0]), new Date(req_periods[id]["periods"][1]))
			req_periods[id]["periods"] = ['', '']
		}
	} else {
		ctx.reply('Вы не выбрали период', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());

	}
}
let select_date = async (ctx) => {
	let id = ctx.chat.id.toString();
	let res1 = await ctx.reply("Начальная дата:", calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar())
	let res2 = await ctx.reply("Конечная дата:", calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar())
	if (!Object.keys(req_periods).includes(id)) {
		req_periods[id] = {}
		req_periods[id]["periods"] = ['', '']
	}
	req_periods[id]["msg_ids"] = [res1["message_id"], res2["message_id"]]
	console.log(res1["message_id"], res2["message_id"])
	//await ctx.reply("Конечная дата:", calendar2.setMinDate(minDate).setMaxDate(maxDate).getCalendar())
	ctx.reply("После выбора дат, нажмите 'Узнать отметки'", Keyboard.make([ [ 'Главная', 'Узнать отметки' ] ]).reply())

};
let get_marks_list = (ctx, s, e) => {
	let id = ctx.chat.id.toString();
	if (Object.keys(subj_requests).includes(id)) {
		if (subj_requests[id].length != 0) {
			for (let i = 0; i < subj_requests[id].length; i++) {
				get_marks(ctx, subj_requests[id][i], s, e);
			}
			ctx.reply('Главная страница', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
		} else {
			ctx.reply('Вы не выбрали предмет(ы)', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
		}

		subj_requests[id] = [];
	} else {
		ctx.reply('Вы не выбрали предмет(ы)', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
	}
};
let msg_marks = async (ctx) => {
	let res = await lessons(mongo_url, ctx.chat.id);
	let arr = [];
	for (let i = 0; i < res.length; i++) {
		arr.push([ Key.callback(res[i], `subj${i}${ctx.chat.id}`) ]);
		bot.action(`subj${i}${ctx.chat.id}`, (ctx) => add_les(ctx, res[i]));
	}
	await ctx.reply('По каким предметам вы хотите получить выписку?', Keyboard.make(arr).inline());
	await ctx.reply(
		'За какой период вы хотите получить выписку?',
		Keyboard.make([
			Key.callback('Вся четверть', `q${ctx.chat.id}`),
			Key.callback('Выбрать', `s${ctx.chat.id}`)
		]).inline()
	);
	bot.action(`q${ctx.chat.id}`, (ctx) => get_marks_list(ctx, last_holidays_day, last_quarter_day));
	bot.action(`s${ctx.chat.id}`, (ctx) => select_date(ctx));
};
let add_les = (ctx, subj) => {
	let id = ctx.chat.id.toString();
	if (Object.keys(subj_requests).includes(id)) {
		subj_requests[id].push(subj);
	} else {
		subj_requests[id] = [ subj ];
	}
	ctx.reply(`${subj} добавлена к списку`);
};
let get_marks = async (ctx, subj, s, e) => {
	//await ctx.reply(`Запрос на выписку отправлен (${subj.toLowerCase()})`);
	let s_marks = await marks(mongo_url, ctx.chat.id, subj, s, e);
	s_marks.sort((a, b) => {
		if (new Date(a[0]) > new Date(b[0])) return 1;
		if (new Date(a[0]) == new Date(b[0])) return 0;
		if (new Date(a[0]) < new Date(b[0])) return -1;
	});
	let period = (s.getDate() < 10 ? '0': '' )+ s.getDate().toString() + '.' +( s.getMonth()+1 < 10 ? '0': '')+(s.getMonth()+1).toString() + ' - ' + (e.getDate() < 10 ? '0': '')+ e.getDate().toString() + '.' +(e.getMonth() +1< 10 ? '0': '') +(e.getMonth()+1).toString()

	let msg = subj + '\n'+ period+ '\n\n';
	if (s_marks.length == 0) msg = `Оценок по ${subj.toLowerCase()} не выставлено`;
	for (let i = 0; i < s_marks.length; i++) {
		let els = s_marks[i];
		msg += els[0] + ' - ' + els[1] + '\n';
	}
	ctx.reply(msg);
};
let send_msg = async (id, text, keyb?) => {
	await bot.telegram
		.sendMessage(id, text, keyb)
		.catch((e) => logger.error('error in sending message to user id=', id, e));
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
			let res = await login(his_creds, id);
			logout(his_creds, id);
			if (res[0] == -1) {
				await send_msg(id, 'Пароль и/или логин неверный, вам нужно перевойти\n\nВаш регистрационный токен:');
				await send_msg(id, id);
				ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make([ 'Я вошёл' ]).reply());
			} else {
				if (!ids.includes(id)) ids.push(id);
				db_ids(mongo_url, ids);
				ctx.reply('Вход выполнен успешно', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
			}
		}
	}
};

let msg_update = async (ctx) => {
	if (!ids.includes(ctx.chat.id)) {
		await send_msg(ctx.chat.id, 'Вам нужно войти', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
		return;
	}
	await send_msg(ctx.chat.id, 'Информация обрабатывается, это может занять некоторое время');
	let b = await check_for_updates(ctx.chat.id);
	if (!b) {
		ctx.reply('Изменений нет', Keyboard.make([ [ 'Войти', 'Обновить', 'Отметки' ] ]).reply());
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
let check_for_updates = async (tg_id: string) => {
	logger.info('chech_for_updates called');
	let cr: [number, string, string] = [ 1, '', '' ];
	while (cr[0] == 1) {
		cr = await login(creds[tg_id.toString()], tg_id);
	}
	// console.log(cr)
	if (cr[0] == -1) {
		send_msg(tg_id, 'Вам нужно перевойти');
		ids.splice(ids.indexOf(tg_id), 1);
	} else {
		let id = cr[1];
		let pupil_link = cr[2];
		let res = await get_data(last_holidays_day, last_quarter_day, 43, id, pupil_link, tg_id);
		logout(id, tg_id);
		logger.debug('result length', res.length, 'res', JSON.stringify(res, null, 2));
		res = await update_db(mongo_url, res, tg_id, tg_id.toString());
		res.sort((a, b) => {
			if (new Date(a[0]) > new Date(b[0])) return 1;
			if (new Date(a[0]) == new Date(b[0])) return 0;
			if (new Date(a[0]) < new Date(b[0])) return -1;
		});
		//console.log(res, res.length);
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
	setInterval(async () => {
		ids = await db_ids(mongo_url);
		for (let i = 0; i < ids.length; i++) {
			check_for_updates(ids[i]);
		}
	}, 1000 * 60 * 1);
};

init();
bot.launch();
