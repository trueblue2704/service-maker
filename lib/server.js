"use strict";

var Hapi           = require("hapi");
var Bluebird       = require("bluebird");
var MongoMapper    = require("genesis").MongoMapper;

var mapper = new MongoMapper(process.env.MONGODB_URL);

Bluebird.promisifyAll(Hapi);

var port   = process.env.PORT || 8080;
var server = module.exports = new Hapi.Server();

server.connection({
	host : process.env.HOST,
	port : port
});

server.registerAsync([
	{
		register : require("good"),

		options : {
			reporters : [
				{
					reporter : require("good-console"),
					events   : [
						{
							error : "*",
							log   : "*"
						}
					]
				}
			]
		}
	},

	{
		register : require("./plugins/rest"),
		options  : {
			mapper : mapper
		}
	}
])
.then(function () {
	return server.startAsync();
})
.then(function () {
	server.log([ "info", "server" ], "Server listening at '" + server.info.uri + "'.");
})
.done();
