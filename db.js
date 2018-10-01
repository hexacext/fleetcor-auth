'use strict';

const MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

var mongodb = {
	updateCode: (authData) => {
		return new Promise(function(resolve, reject){
			MongoClient.connect(process.env.MONGODB_URL + process.env.MONGODB_NAME, function(err, db) {
				console.log("Inside db");
				if (err) { 
					console.log("Error in getting connection ", err);
					return reject(err);
				} else {	  
					db.collection("fleetcor_code").updateOne({"code": authData.code}, {$set: {"access_token": authData.accessToken, "refresh_token": authData.refreshToken}}, {upsert: true} , 
					function(error, result){
						if(error){
							console.log("Error in updateCode ", error);
							return reject(error);
						} else {
							console.log("Updated ", result.result.nModified);
							return resolve();
						}
						db.close();
					});
				}
			});
		});
	},
	loadCode: (code) => {
		return new Promise(function(resolve, reject){
			MongoClient.connect(process.env.MONGODB_URL + process.env.MONGODB_NAME, function(err, db) {
				console.log("Inside db");
				if (err) { 
					console.log("Error in getting connection ", err);
					return reject(err);
				} else {	  
					db.collection("fleetcor_code").find({"code": code}).toArray((error, result) => {
						if(error){
							console.log(error);
							return reject(error);
						} else {
							if(result.length > 0){
								console.log(result[0]);
								return resolve(result[0]);
							} else {
								return resolve(0);
							}
						}
						db.close();
					});
				}
			});
		});
	}
};

module.exports = mongodb;