let bunyan = require("bunyan");
let log = bunyan.createLogger({
  name: "school_bot",
  streams: [
    // {
    //   stream: process.stdout,
    // },
    {
      level: 30,
      path: "logs.log",
      period: '1d',
    },
    {
      level: 20,
      path: "detailed_logs.log",
      period: '1d'
    },
  ],
});

module.exports = (name) => {
    return log.child({widget_type: name});
}