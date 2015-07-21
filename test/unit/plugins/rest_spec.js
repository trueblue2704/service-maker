"use strict";

var Request         = require("apparition").Request;
var Bluebird        = require("bluebird");
var Hapi            = require("hapi");
var Rest            = require("../../../lib/plugins/rest");
var MemoryMapper    = require("genesis").MemoryMapper;
var expect          = require("chai").expect;
var InstanceAdapter = require("../../../lib/services/instanceAdapter.js");
var AwsAdapter      = require("../../../lib/services/awsAdapter");
var SshAdapter      = require("../../../lib/services/sshAdapter");
var Sinon           = require("sinon");

require("sinon-as-promised");

Bluebird.promisifyAll(Hapi);

describe("The Rest plugin", function () {
	var VALID_INSTANCE_ID = "da14fbf2-5404-4f92-b55f-a961578204ed";
	var VALID_AMI         = "ami-d05e75b8";
	var VALID_TYPE        = "t2.micro";
	var ID_REGEX          = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

	var INVALID_AMI       = [ "ami-defualt" ];
	var INVALID_QUERY     = "clumsy-cheetah";

	var location          = /\/v1\/instances\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

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

		after(function () {
			return server.stopAsync();
		});

		it("provides the '/' route", function () {
			return new Request("GET", "/").inject(server)
			.then(function (response) {
				expect(response.statusCode, "status").to.equal(200);
			});
		});
	});

	describe("creating a new instance", function () {
		var server          = new Hapi.Server();
		var instanceAdapter = new InstanceAdapter();
		var createInstanceStub;
		var runInstancesStub;
		var startSshPollingStub;
		var getPublicIPAddressStub;
		var awsAdapter = new AwsAdapter();
		var sshAdapter = new SshAdapter();

		before(function () {
			createInstanceStub = Sinon.stub(instanceAdapter, "createInstance")
			.returns(Bluebird.resolve({
				ami   : "ami-d05e75b8",
				type  : "t2.micro",
				state : "pending",
				uri   : ""
			}));

			runInstancesStub = Sinon.stub(awsAdapter, "runInstances")
			.returns(Bluebird.resolve({
				id         : "0373ee03-ac16-42ec-b81c-37986d4bcb01",
				ami        : "ami-d05e75b8",
				type       : "t2.micro",
				revision   : 0,
				state      : "pending",
				uri        : null,
				instanceID : VALID_EC2_INSTANCE
			}));

			startSshPollingStub = Sinon.stub(sshAdapter, "startSshPolling")
			.returns(Bluebird.resolve(VALID_EC2_INSTANCE));

			getPublicIPAddressStub = Sinon.stub(awsAdapter, "getPublicIPAddress")
			.returns(Bluebird.resolve(VALID_IP_ADDRESS));

			server.connection();
			return server.registerAsync({
				register : Rest,
				options  : {
					awsAdapter : awsAdapter,
					sshAdapter : sshAdapter
				}
			});
		});

		after(function () {
			createInstanceStub.restore();
			runInstancesStub.restore();
			getPublicIPAddressStub.restore();
			startSshPollingStub.restore();
			return server.stopAsync();
		});

		describe("with valid parameters passed", function () {
			it("creates the instance and returns the canonical uri", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : VALID_AMI,
					type : VALID_TYPE
				});
				return request.inject(server)
				.then(function (response) {
					response.payload = JSON.parse(response.payload);
					expect(response.statusCode, "status").to.equal(201);
					expect(response.headers.location, "location").to.match(location);
					//check if DB has been updated to running & uri has been updated
				});
			});
		});

		describe("with no parameters passed", function () {
			it("creates the instance and returns the canonical uri", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json");
				return request.inject(server)
				.then(function (response) {
					response.payload = JSON.parse(response.payload);
					expect(response.statusCode, "status").to.equal(201);
					expect(response.headers.location, "location").to.match(location);
					//check if DB has been updated to running & uri has been updated
				});
			});
		});

		describe("with invalid parameter(s) passed", function () {
			it("returns an error with statusCode 400", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : INVALID_AMI,
					type : VALID_TYPE
				});
				return request.inject(server)
				.then(function (response) {
					var error = JSON.parse(response.payload);
					expect(error.statusCode, "status").to.equal(400);
					expect(error.message)
					.to.equal("Bad Request: Please check the parameters passed.");
				});
			});
		});

	});

	describe("fails in creating a new instance", function () {
		var server          = new Hapi.Server();
		var instanceAdapter = new InstanceAdapter();
		var createInstanceStub;
		var runInstancesStub;
		var updateInstanceStub;

		var awsAdapter = new AwsAdapter();

		before(function () {
			createInstanceStub = Sinon.stub(instanceAdapter, "createInstance")
			.returns(Bluebird.resolve({
				ami   : "ami-d05e75b8",
				type  : "t2.micro",
				state : "pending",
				uri   : ""
			}));

			updateInstanceStub = Sinon.stub(instanceAdapter, "updateInstance")
			.returns(Bluebird.resolve({
				ami   : "ami-d05e75b8",
				type  : "t2.micro",
				state : "failed",
				uri   : ""
			}));

			server.connection();

			return server.registerAsync({
				register : Rest,
				options  : {
					awsAdapter : awsAdapter
				}
			});
		});

		after(function () {
			updateInstanceStub.restore();
			createInstanceStub.restore();
			return server.stopAsync();
		});

		describe("when the credentials aren't properly configured", function () {
			before(function () {
				var AuthError  = new Error();
				AuthError.name = "AuthFailure";

				runInstancesStub = Sinon.stub(awsAdapter, "runInstances")
				.rejects(AuthError);
			});

			after(function () {
				runInstancesStub.restore();
			});

			it("returns an error with statusCode 500", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : VALID_AMI,
					type : VALID_TYPE
				});
				return request.inject(server)
				.then(function (response) {
					var error = JSON.parse(response.payload);
					expect(error.statusCode, "status").to.equal(500);
					expect(error.message)
					.to.equal("An internal server error occurred");
				});
			});
		});

		describe("with an ami that doesn't exist", function () {

			before(function () {
				var AMIError  = new Error();
				AMIError.name = "InvalidAMIID.Malformed";

				runInstancesStub = Sinon.stub(awsAdapter, "runInstances")
				.rejects(AMIError);
			});

			after(function () {
				runInstancesStub.restore();
			});

			it("returns an error with statusCode 400", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : "ami-invalid",
					type : VALID_TYPE
				});
				return request.inject(server)
				.then(function (response) {
					var error = JSON.parse(response.payload);
					expect(error.statusCode, "status").to.equal(400);
					expect(error.message)
					.to.equal("The AMI entered does not exist. Ensure it is of the form ami-xxxxxx.");
				});
			});
		});

		describe("with a type that doesn't exist", function () {

			before(function () {
				var TypeError  = new Error();
				TypeError.name = "InvalidParameterValue";

				runInstancesStub = Sinon.stub(awsAdapter, "runInstances")
				.rejects(TypeError);
			});

			after(function () {
				runInstancesStub.restore();
			});

			it("returns an error with statusCode 400", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : VALID_AMI,
					type : "t2.notExist"
				});
				return request.inject(server)
				.then(function (response) {
					var error = JSON.parse(response.payload);
					expect(error.statusCode, "status").to.equal(400);
					expect(error.message)
					.to.equal("The Type entered does not exist. Ensure it is a valid EC2 type.");
				});
			});
		});

	});

	describe("when there is a problem with the database connection", function () {
			var mapper = new MemoryMapper();
			var server = new Hapi.Server();

			before(function () {
				Sinon.stub(mapper, "create").rejects(new Error("Simulated Failure."));
				server.connection();
				return server.registerAsync({
					register : Rest,
					options  : {
						mapper : mapper
					}
				});
			});

			after(function () {
				mapper.create.restore();
				return server.stopAsync();
			});

			it("returns an internal server error with status code 500", function () {
				var request = new Request("POST", "/v1/instances").mime("application/json").payload({
					ami  : VALID_AMI,
					type : VALID_TYPE
				});
				return request.inject(server)
				.then(function (response) {
					expect(response.result.message).to.equal("An internal server error occurred");
					expect(response.statusCode).to.equal(500);
				});

			});
		});
	});
});

