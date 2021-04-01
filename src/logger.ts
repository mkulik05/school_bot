import {createLogger} from 'bunyan';
let log = createLogger({
	name: 'school_bot',
	streams: [
		{
		  stream: process.stdout,
		},
		{
			level: 0,
			path: 'logs.log',
			period: '1d'
		},
		{
			level: 0,
			path: 'detailed_logs.log',
			period: '1d'
		}
	]
});

let create_log = (name: string) => {
	return log.child({ widget_type: name });
};
export {create_log}