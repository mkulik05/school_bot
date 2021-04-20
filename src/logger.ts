import {createLogger} from 'bunyan';
let log = createLogger({
	name: 'school_bot',
	streams: [
		{
			type: 'rotating-file',
			path: 'detailed_logs.log',
			period: '5h',   
			count: 10,       
			level: 0
		}
	]
});

let create_log = (name: string) => {
	return log.child({ widget_type: name });
};
export {create_log}