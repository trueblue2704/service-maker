"use strict";

var AwsAdapter = require("../../../lib/services/awsAdapter");
var expect     = require("chai").expect;
var Bluebird   = require("bluebird");
var Sinon      = require("sinon");
var AWS        = require("aws-sdk");
var ec2        = new AWS.EC2();

Bluebird.promisifyAll(ec2);

require("sinon-as-promised")(Bluebird);

describe("The AwsAdapter class ", function () {
	var DEFAULT_IMAGE_ID      = "ami-d05e75b8";
	var DEFAULT_INSTANCE_TYPE = "t2.micro";

	var INVALID_IMAGE_ID      = "ami-invalid";

	var VALID_INSTANCE = {
		ami  : DEFAULT_IMAGE_ID,
		type : DEFAULT_INSTANCE_TYPE
	};

	var INVALID_INSTANCE = {
		ami  : INVALID_IMAGE_ID,
		type : DEFAULT_INSTANCE_TYPE
	};
	describe("creating a new instance with valid ami, type", function () {
		var runInstancesStub;
		var createTagsStub;
		var result;
		before(function () {
			var awsAdapter = new AwsAdapter(ec2);
			createTagsStub = Sinon.stub(ec2, "createTagsAsync", function () {
				return "test";
			});

			runInstancesStub = Sinon.stub(ec2, "runInstancesAsync", function () {
				var data = {
					Instances : [ {
						InstanceId : "test"
					} ]
				};
				return Bluebird.resolve(data);
			});

			awsAdapter.runInstances(VALID_INSTANCE)
			.then(function (response) {
				result = response;
			});
		});

		after(function () {
			runInstancesStub.restore();
			createTagsStub.restore();
		});

		it("returns a new instance with the ami and type provided", function () {
			expect(result.ami, "response").to.equal("ami-d05e75b8");
			expect(result.type, "response").to.equal("t2.micro");
		});
	});

	describe("creating a new instance with invalid ami, type", function () {
		var runInstancesStub;
		var createTagsStub;
		var result;
		before(function () {
			var awsAdapter = new AwsAdapter(ec2);
			createTagsStub = Sinon.stub(ec2, "createTagsAsync", function () {
				return "test";
			});

			runInstancesStub = Sinon.stub(ec2, "runInstancesAsync", function () {
				var error = new Error();
				error.name = "InvalidAMIID.Malformed";
				error.message = "The specified AMI ID is not valid. It should be of the form ami-xxxxxx.";
				return Bluebird.reject(error);
			});

			awsAdapter.runInstances(INVALID_INSTANCE)
			.then(function (response) {
				result = response;
			})
			.catch(function (error) {
				result = error;
			});

		});

		after(function () {
			runInstancesStub.restore();
			createTagsStub.restore();
		});

		it("throws an InvalidAMIID.Malformed error", function () {
			expect(result, "error").to.be.instanceof(Error);
			expect(result.message).to.equal("The specified AMI ID is not valid. It should be of the form ami-xxxxxx.");
		});
	});

	describe("creating a new instance with invalid ami, type", function () {
		var runInstancesStub;
		var createTagsStub;
		var result;
		before(function () {
			var awsAdapter = new AwsAdapter(ec2);
			createTagsStub = Sinon.stub(ec2, "createTagsAsync", function () {
				return "test";
			});

			runInstancesStub = Sinon.stub(ec2, "runInstancesAsync", function () {
				var error = new Error();
				error.name = "InvalidAMIID.Malformed";
				error.message = "The specified AMI ID is not valid. It should be of the form ami-xxxxxx.";
				return Bluebird.reject(error);
			});

			awsAdapter.runInstances(INVALID_INSTANCE)
			.then(function (response) {
				result = response;
			})
			.catch(function (error) {
				result = error;
			});

		});

		after(function () {
			runInstancesStub.restore();
			createTagsStub.restore();
		});

		it("throws an InvalidAMIID.Malformed error", function () {
			expect(result, "error").to.be.instanceof(Error);
			expect(result.message).to.equal("The specified AMI ID is not valid. It should be of the form ami-xxxxxx.");
		});
	});

	describe("creating a new instance with invalid ami, type", function () {
		var runInstancesStub;
		var createTagsStub;
		var result;
		before(function () {
			var awsAdapter = new AwsAdapter(ec2);
			createTagsStub = Sinon.stub(ec2, "createTagsAsync", function () {
				return "test";
			});

			runInstancesStub = Sinon.stub(ec2, "runInstancesAsync", function () {
				return Bluebird.reject(new Error("Simulated EC2 Error"));
			});

			awsAdapter.runInstances(INVALID_INSTANCE)
			.then(function (response) {
				result = response;
			})
			.catch(function (error) {
				result = error;
			});

		});

		after(function () {
			runInstancesStub.restore();
			createTagsStub.restore();
		});

		it("throws an InvalidAMIID.Malformed error", function () {
			expect(result, "error").to.be.instanceof(Error);
		});
	});
});
