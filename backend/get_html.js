let request = require('request-promise');
let get_html = async (id, path) => {
    var headers = {
        'cookie': 'sessionid=' + id
      };
    let resp = 0
      var options = {
          url: path,
          headers: headers
      };
    
      function callback(error, response, body) {
        if (!error) {
          resp = body
        }
      }
    
      await request(options, callback);
      id = ""
      return resp
}
module.exports.html = get_html