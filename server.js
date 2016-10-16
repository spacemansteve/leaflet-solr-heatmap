var connect = require('connect');
console.log(__dirname);
connect().use(connect.static(__dirname)).listen(80);
