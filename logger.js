let bunyan = require("bunyan");
let log = bunyan.createLogger({
  name: "school_bot",
  streams: [
    // {
    //   stream: process.stdout,
    // },
    {
      level: 30,
      path: "logs.log"
    },
    {
      level: 20,
      path: "detailed_logs.log"
    },
  ],
});

module.exports = (name) => {
    return log.child({widget_type: name});
}