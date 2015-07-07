"use strict";

var Request  = require("apparition").Request;
var Bluebird = require("bluebird");
var Hapi     = require("hapi");
var Rest     = require("../../../lib/plugins/rest");
var expect   = require("chai").expect;

Bluebird.promisifyAll(Hapi);

describe("The Rest plugin", function () {
	it("is a Hapi plugin", function () {
		expect(Rest, "attributes").to.have.property("register")
		.that.is.a("function")
		.and.that.has.property("attributes")
		.that.has.property("name", "rest");
	});

	describe("when registered", function () {
		var server = new Hapi.Server();

		before(function () {
			server.connection();
			return server.registerAsync(Rest);
		});

		it("provides the '/' route", function () {
			return new Request("GET", "/").inject(server)
			.then(function (response) {
				expect(response.statusCode, "status").to.equal(200);
			});
		});
	});
});

describe("The Rest Plugin", function () {
	var VALID_AMI     = "ami-default";
	var VALID_TYPE    = "t2.micro";
	//var INVALID_AMI   = [ "ami-defualt" ];
	//var INVALID_TYPE  = [ "t2.micro" ];

	describe("when a valid request is made", function () {
		var server = new Hapi.Server();

		before(function () {
			server.connection();
			return server.registerAsync(Rest);
		});

		it("creates the instance and returns the canonical url", function () {
			var request = new Request("POST", "/v1/instances").mime("application/json").payload({
				ami  : VALID_AMI,
				type : VALID_TYPE
			});
			return request.inject(server)
			.then(function (response) {
				expect(response.statusCode, "status").to.equal(201);
				//expect(response.location, "location").to.match(/v1/instances/);
			});
		});
	});
});
