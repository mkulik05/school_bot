import { Telegraf } from 'telegraf';
import * as Calendar from 'telegraf-calendar-telegram';
const { Keyboard, Key } = require('telegram-keyboard');
let bot_token = require('../configs/bot_token.json');
import { login, logout } from './login';
import { get_ids as db_ids } from './sync_ids_db';
import { get_creds as db_creds } from './sync_creds_db';
import { get_data } from './get_data';
import { get_lessons as lessons } from './get_les_db';
import { get_marks_hw as marks_hw } from './marks_hw_db';
import { get_hw_d as hw_d } from './get_hw_d_db';
import { update_db } from './db';
import { create_log } from './logger';
import { get_current_quarter_id, get_quarter_borders } from './get_quarter_borders';
const logger = create_log('main');

let first_quarter_day = '2022-01-09';
let last_quarter_day = '2022-03-25';
let quarter_id = 56
const bot = new Telegraf(bot_token.token);
const calendar = new Calendar(bot);
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
//let req_periods = {};
let requests = {};
let periods = {};

bot.start((ctx) => {
	logger.info({ tg_id: ctx.chat.id }, `called /start func`)
	ctx.reply(
		'Привет! Этот бот поможет с электронным дневником',
		Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
	);
});

calendar.setDateListener((ctx, date) => {
	logger.info({ tg_id: ctx.chat.id }, `called date listener`)
	let id = ctx.chat.id.toString();
	let msg_id = ctx.update.callback_query.message.message_id;
	if (Object.keys(periods).includes(id)) {
		let name = periods[id][msg_id];
		logger.debug({ tg_id: ctx.chat.id }, `name = ${name}, msg_id = ${msg_id}, periods[id] = ${JSON.stringify(periods[id], null, 2)}`)
		if (!Object.keys(periods[id][name]).includes('periods')) {
			periods[id][name]['periods'] = ['', ''];
		}
		if (periods[id][name]['periods'][0] == '') {
			periods[id][name]['periods'][0] = date;
			ctx.reply("Теперь выберите конечную дату")
		} else if (periods[id][name]['periods'][1] == '') {
			periods[id][name]['periods'][1] = date;
			ctx.deleteMessage();
		}
	} else {
		logger.debug({ tg_id: ctx.chat.id }, `obj "periods" don't include this id`)
		periods[id] = {}
	}
});

let get_period = async (ctx, name, btn) => {
	logger.info({ tg_id: ctx.chat.id }, `get period func called name = ${name}, btn = ${btn}`)
	let id = ctx.chat.id.toString();
	let res1 = await ctx.reply('Выберите период:', calendar.setMinDate(minDate).setMaxDate(maxDate).getCalendar());
	if (!Object.keys(periods).includes(id)) {
		logger.debug({ tg_id: ctx.chat.id }, `obj "periods" don't include this id`)
		periods[id] = {};
		periods[id][name] = {};
		periods[id][name]['periods'] = ['', ''];
	}
	if (!Object.keys(periods[id]).includes(name)) {
		periods[id][name] = {};
		periods[id][name]['periods'] = ['', ''];
	}
	periods[id][res1['message_id']] = name;
	logger.debug({ tg_id: ctx.chat.id }, `periods[id][name] - ${JSON.stringify(periods[id][name])}`)
	await ctx.reply(`После выбора дат, нажмите '${btn}'`, Keyboard.make([['Главная', btn]]).reply());
};

const today = new Date();
const minDate = new Date();
minDate.setMonth(today.getMonth() - 2);
const maxDate = new Date();
maxDate.setMonth(today.getMonth() + 2);
maxDate.setDate(today.getDate());

bot.on('text', async (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, `get text message: ${ctx.message.text}`)
	switch (ctx.message.text) {
		case 'Обновить':
			msg_update(ctx);
			break;
		case 'Главная':
			ctx.reply(
				'Главная страница',
				Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
			);
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
			msg_marks_hw(ctx, 1);
			break;
		case 'Узнать отметки':
			validate_dates(ctx, 'get_marks', send_req, 1);
			break;
		case 'Узнать дз':
			validate_dates(ctx, 'get_hw', send_req, 0);
			break;
		case 'Узнать дз за эти дни':
			validate_dates(ctx, 'get_marks_d', get_hw_d, 0);
			break;
		case 'Расписание':
			get_period(ctx, 'get_shedule', 'Узнать расписание');
			break;
		case 'Узнать расписание':
			validate_dates(ctx, 'get_shedule', get_shedule, 0);
			break;
		case 'Дз':
			msg_hw(ctx);
			break;
	}
});

let get_hw_d = async (ctx, s, e) => {
	logger.info({ tg_id: ctx.chat.id }, `get_hw_d called`)
	logger.debug({ tg_id: ctx.chat.id }, `s = ${s}, e = ${e}`)
	let res = await hw_d(mongo_url, ctx.chat.id, s, e);

	res.sort((a, b) => {
		if (new Date(a[0]) > new Date(b[0])) return 1;
		if (a[0] === b[0]) return 0;
		if (new Date(a[0]) < new Date(b[0])) return -1;
	});
	for (let i = 0; i < res.length; i++) {
		let msg = res[i][0].split('-')[1] + '-' + res[i][0].split('-')[2] + '\n\n';
		for (let b = 0; b < res[i][1].length; b++) {
			let line = res[i][1][b];
			msg += ` ${b + 1}. ` + line[0] + ' - ' + (line[1] == '' ? 'не выставлено' : line[1]) + '\n';
		}
		await send_msg(
			ctx.chat.id,
			msg,
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
	if (res.length === 0) {
		await send_msg(
			ctx.chat.id,
			'За этот период не выставлено дз',
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
};

let get_shedule = async (ctx, s, e) => {
	logger.info({ tg_id: ctx.chat.id }, `called get_shedule`)
	let res = await hw_d(mongo_url, ctx.chat.id, s, e);
	res = res.sort((a, b) => {
		if (new Date(a[0]) > new Date(b[0])) return 1;
		if (a[0] === b[0]) return 0;
		if (new Date(a[0]) < new Date(b[0])) return -1;
	});
	for (let i = 0; i < res.length; i++) {
		let msg = res[i][0].split('-')[1] + '-' + res[i][0].split('-')[2] + '\n\n';
		for (let b = 0; b < res[i][1].length; b++) {
			let line = res[i][1][b];
			msg += ` ${b + 1}. ` + line[0] + '\n';
		}
		await send_msg(
			ctx.chat.id,
			msg,
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
	if (res.length === 0) {
		await send_msg(
			ctx.chat.id,
			'Нет расписания на этот период',
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
};

let msg_hw = async (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, `called msg_hw`)
	bot.action(`hw_subj${ctx.chat.id}`, (ctx) => msg_marks_hw(ctx, 0));
	bot.action(`hw_d${ctx.chat.id}`, (ctx) => get_period(ctx, 'get_marks_d', 'Узнать дз за эти дни'));
	ctx.reply(
		'По каким предметам вы хотите получить выписку?',
		Keyboard.make([
			Key.callback('Выписка по дням', `hw_d${ctx.chat.id}`),
			Key.callback('Выписка по предметам', `hw_subj${ctx.chat.id}`)
		]).inline()
	);
};

let validate_dates = (ctx, name, nextFunc, is_mark) => {
	logger.info({ tg_id: ctx.chat.id }, "validate dates called")
	let id = ctx.chat.id.toString();
	if (Object.keys(periods).includes(id)) {
		if (Object.keys(periods[id]).includes(name)) {
			if (periods[id][name]['periods'][0] == '') ctx.reply('Вы не выбрали начальную дату');
			if (periods[id][name]['periods'][1] == '') ctx.reply('Вы не выбрали конечную дату');
			if (periods[id][name]['periods'][0] != '' && periods[id][name]['periods'][1] != '') {
				nextFunc(ctx, periods[id][name]['periods'][0], periods[id][name]['periods'][1], is_mark);
				periods[id][name]['periods'] = ['', ''];
			}
		} else {
			ctx.reply('Вы не выбрали период');
		}
	} else {
		ctx.reply('Вы не  выбрали период');
	}
};

let send_req = (ctx, s, e, is_mark) => {
	logger.info({ tg_id: ctx.chat.id }, `called send req`)
	logger.debug({ tg_id: ctx.chat.id }, `s = ${s}, e = ${e}, is_mark = ${is_mark}`)
	let key = is_mark ? 'mark_requests' : 'hw_requests';
	let id = ctx.chat.id.toString();
	if (Object.keys(requests).includes(id)) {
		if (requests[id][key].size != 0) {
			let subj_requests_arr = Array.from(requests[id][key]);
			for (let i = 0; i < requests[id][key].size; i++) {
				get_marks(ctx, subj_requests_arr[i], s, e, is_mark);
			}
			ctx.reply(
				'Главная страница',
				Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
			);
		} else {
			ctx.reply(
				'Вы не выбрали предмет(ы)',
				Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
			);
		}

		requests[id][key] = new Set();
	} else {
		ctx.reply(
			'Вы не выбрали предмет(ы)',
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
};

let msg_marks_hw = async (ctx, is_mark) => {
	logger.info({ tg_id: ctx.chat.id }, `called mst_marks_hw, is_mark = ${is_mark}`)
	let res: Array<string> = await lessons(mongo_url, ctx.chat.id);
	let arr = [[Key.callback('Все предметы', `all_subj${is_mark}${ctx.chat.id}`)]];
	bot.action(`all_subj${is_mark}${ctx.chat.id}`, (ctx) => {
		add_les(ctx, res, 1, is_mark);
	});
	let line = []
	for (let i = 0; i < res.length; i++) {
		line.push(Key.callback(res[i], `subj${is_mark}${i}${ctx.chat.id}`));
		if (i % 3 == 0) {
			arr.push(line)
			line = []
		}
		bot.action(`subj${is_mark}${i}${ctx.chat.id}`, (ctx) => {
			add_les(ctx, [res[i]], 0, is_mark);
		});
	}
	await ctx.reply('По каким предметам вы хотите получить выписку?', Keyboard.make(arr).inline());
	await ctx.reply(
		'За какой период вы хотите получить выписку?',
		Keyboard.make([
			Key.callback('Вся четверть', `q${is_mark}-${ctx.chat.id}`),
			Key.callback('Выбрать', `s${is_mark}-${ctx.chat.id}`)
		]).inline()
	);
	if (is_mark) {
		bot.action(`q1-${ctx.chat.id}`, (ctx) => send_req(ctx, first_quarter_day, last_quarter_day, 1));
		bot.action(`s1-${ctx.chat.id}`, (ctx) => get_period(ctx, 'get_marks', 'Узнать отметки'));
	} else {
		bot.action(`q0-${ctx.chat.id}`, (ctx) => send_req(ctx, first_quarter_day, last_quarter_day, 0));
		bot.action(`s0-${ctx.chat.id}`, (ctx) => get_period(ctx, 'get_hw', 'Узнать дз'));
	}
};
let add_les = (ctx, subjs: Array<string>, all, is_mark) => {
	logger.info({ tg_id: ctx.chat.id }, `called add_les, all = ${all}, is_mark = ${is_mark}`)
	logger.debug({ tg_id: ctx.chat.id }, `subjs = ${subjs}`)
	let key = is_mark ? 'mark_requests' : 'hw_requests';
	let id = ctx.chat.id.toString();
	for (let i = 0; i < subjs.length; i++) {
		let subj = subjs[i]
		if (Object.keys(requests).includes(id)) {

			requests[id][key].add(subj);
		} else {
			requests[id] = { "mark_requests": new Set(), "hw_requests": new Set() };
			requests[id][key].add(subj);
		}
	}


	if (!all) {
		ctx.reply(`${subjs[0]} добавлен(а) к списку`);
	} else {
		ctx.reply(`Все предметы добавлены к списку`);
	}
};
let get_marks = async (ctx, subj, s, e, is_mark) => {
	logger.debug({ tg_id: ctx.chat.id }, `subj = ${subj}, s = ${s}, e = ${e}, is_mark = ${is_mark}`)
	//await ctx.reply(`Запрос на выписку отправлен (${subj.toLowerCase()})`);
	let result = await marks_hw(mongo_url, ctx.chat.id, subj, s, e, is_mark ? true : false);
	result.sort((a, b) => {
		if (new Date(a[0]) > new Date(b[0])) return 1;
		if (a[0] == b[0]) return 0;
		if (new Date(a[0]) < new Date(b[0])) return -1;
	});
	let period =
		(new Date(s).getDate() < 10 ? '0' : '') +
		new Date(s).getDate().toString() +
		'.' +
		(new Date(s).getMonth() + 1 < 10 ? '0' : '') +
		(new Date(s).getMonth() + 1).toString() +
		' - ' +
		(new Date(e).getDate() < 10 ? '0' : '') +
		new Date(e).getDate().toString() +
		'.' +
		(new Date(e).getMonth() + 1 < 10 ? '0' : '') +
		(new Date(e).getMonth() + 1).toString();

	let msg = subj + '\n' + period + '\n\n';
	if (is_mark && result.length == 0) msg = `Оценок по ${subj.toLowerCase()} не выставлено`;
	if (!is_mark && result.length == 0) msg = `Дз по ${subj.toLowerCase()} не записано`;
	let all = []
	for (let i = 0; i < result.length; i++) {
		let res = result[i];

		msg += res[0].split('-')[1] + '-' + res[0].split('-')[2] + ' - ' + res[1] + '\n';
		all.push(res[1])
	}

	if (is_mark && result.length != 0) msg += all.reduce((a, b) => (a + b)) / all.length
	ctx.reply(msg);

};
let send_msg = async (id, text, keyb?) => {
	await bot.telegram
		.sendMessage(id, text, keyb)
		.catch((e) => logger.error('error in sending message to user id=', id, e));
};
let msg_reenter = async (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, `msg_reenter called`)
	let id = ctx.chat.id;
	await send_msg(
		id,
		`Вам нужно войти в учётную запись своего дневника\n\nВнимание, войдя в свою учётную запись, Вы даёте права на использование и хранение ваших данных(telegram id, пароль и логин от учётной записи дневника)\n\nВаш регистрационный токен:`
	);
	await send_msg(id, id);
	ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make(['Я вошёл']).reply());
};

let msg_i_login = async (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, "msg_i_login called")
	creds = await db_creds(mongo_url);
	let id = ctx.chat.id;
	if (creds != null) {
		let his_creds = creds[id.toString()];
		if (typeof his_creds == 'undefined') {
			logger.debug({ tg_id: ctx.chat.id }, `should relogin`)
			await send_msg(
				id,
				`Вас нет в базе данных, вам нужно войти в свою учётную запись\n\nВаш регистрационный токен:`
			);
			await send_msg(id, id);
			ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make(['Я вошёл']).reply());
		} else {
			let res = await login(his_creds, id);
			logout(his_creds, id);
			if (res[0] == -1) {
				await send_msg(id, 'Пароль и/или логин неверный, вам нужно перевойти\n\nВаш регистрационный токен:');
				await send_msg(id, id);
				ctx.reply(`Страница входа: ` + 'https://schoolbot.ml/', Keyboard.make(['Я вошёл']).reply());
			} else {
				if (!ids.includes(id)) ids.push(id);
				db_ids(mongo_url, ids);
				ctx.reply(
					'Вход выполнен успешно',
					Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
				);
			}
		}
	} else {
		logger.info({ tg_id: ctx.chat.id }, `creds = null`)
	}
};

let msg_update = async (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, 'msg_update called')
	if (!ids.includes(ctx.chat.id)) {
		await send_msg(
			ctx.chat.id,
			'Вам нужно войти',
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
		return;
	}
	await send_msg(ctx.chat.id, 'Информация обрабатывается, это может занять некоторое время');
	let b = await check_for_updates(ctx.chat.id);
	if (!b) {
		ctx.reply(
			'Изменений нет',
			Keyboard.make([['Войти', 'Обновить'], ['Отметки', 'Дз', 'Расписание']]).reply()
		);
	}
};

let msg_enter = (ctx) => {
	logger.info({ tg_id: ctx.chat.id }, `msg_enter called`)
	let id = ctx.chat.id;
	if (ids.includes(id)) {
		ctx.reply('Вы уже зашли', Keyboard.make(['Главная', 'Перевойти']).reply());
	} else {
		msg_reenter(ctx);
	}
};

let find_changes = (obj1, obj2, tg_id, skip_keys = ['_id']) => {
	// arr1 - старый, arr2 - новый
	logger.info({ tg_id: tg_id }, 'find_changes called');
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
bot.help((ctx) => ctx.reply("Для начала нужно войти, для всех функций есть одноимённые кнопки в нижней части экрана.\n Бот периодически автоматически проверяет изменения в дневнике"));
let configure_message = (pair, tg_id) => {
	logger.info({ tg_id: tg_id }, `configure_message called`)
	let date = pair[0].date.split('-');
	let answ = date[1] + '-' + date[2] + '\n\n';
	let changes = find_changes(pair[0], pair[1], tg_id);
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
let login_easy = async (tg_id: string) => {
	let cr: [number, string, string] = [1, '', ''];
	while (cr[0] === 1) {
		cr = await login(creds[tg_id.toString()], tg_id);
		logger.info({ tg_id: tg_id }, `login...`)
	}
	if (cr[0] == -1) {
		send_msg(tg_id, 'Вам нужно перевойти');
		ids.splice(ids.indexOf(tg_id), 1);
		return [0, "", ""]
	} else {
		let id = cr[1];
		let pupil_link = cr[2];
		let res: [number, string, string] = [1, id, pupil_link]
		return res


	}
}

let check_for_updates = async (tg_id: string) => {
	logger.info({ tg_id: tg_id }, 'chech_for_updates called');

	let r = await login_easy(tg_id)
	let ok = r[0]
	let id = r[1]
	let pupil_link = r[2]
	if (ok) {
		let res = await get_data(new Date(first_quarter_day), new Date(last_quarter_day), quarter_id, id, pupil_link, tg_id);
		logout(id.toString(), tg_id);
		logger.debug({ tg_id: tg_id }, 'result length', res.length, 'res', JSON.stringify(res, null, 2));
		res = await update_db(mongo_url, res, tg_id, tg_id.toString());
		res.sort((a, b) => {
			if (new Date(a[1]['date']) > new Date(b[1]['date'])) return 1;
			if (a[1]['date'] === b[1]['date']) return 0;
			if (new Date(a[1]['date']) < new Date(b[1]['date'])) return -1;
		});
		for (let i = 0; i < res.length; i++) {
			let pair = res[i];
			let answ = configure_message(pair, tg_id);
			await send_msg(tg_id, answ);
		}
		return res.length != 0;
	}

};

let update_borders = async () => {
	if (ids.length > 0) {
		let tg_id = ids[0]
		let r = await login_easy(tg_id)
		let ok = r[0]
		if (ok) {
			let session_id = r[1]
			let pupil_link = r[2]
			let quater_id = await get_current_quarter_id(session_id.toString(), pupil_link.toString())
			let borders = await get_quarter_borders(session_id, pupil_link, quater_id, tg_id)
			first_quarter_day = borders.start
			last_quarter_day = borders.end
			logout(session_id.toString(), tg_id)
		}
	}
}
let i = 0
let init = async () => {
	logger.info("called init")
	ids = await db_ids(mongo_url);
	creds = await db_creds(mongo_url);
	await update_borders()
	for (let i = 0; i < ids.length; i++) {
		check_for_updates(ids[i]);
	}
	setInterval(async () => {
		i += 1
		if (i > 100) {
			await update_borders()
			i = 0
		}
		ids = await db_ids(mongo_url);
		for (let i = 0; i < ids.length; i++) {
			check_for_updates(ids[i]);
		}
	}, 1000 * 60 * 2);
};


init();
bot.launch();
