'use strict';

const requestModule = require('request'),
	config = require('./config');	

var api = {
	//To get the user details using the accessToken
	getUserDetails: (token) => {
		console.log("Inside get user details API");
		let options = {
			method: 'GET',
			url: config.apiDomain + config.userProfileURL,
			headers: {
				authorization: 'Bearer ' + token, //Bearer Token
			}
		};
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					var data = JSON.parse(body);
					return resolve(data);
				} else if(response && response.statusCode == 401){
					return resolve(" ");
				} else {
					console.log("SC ",response.statusCode);
					return reject(error);
				}
			});
		});
	},
	//To get the access Token using the username and password
	getAccessToken: (credentials) => {
		console.log("Inside get access token API");
		let options = {
			url: config.apiDomain + config.accessTokenURL,
			method: 'POST',
			json: {
				loginName: credentials.username,
				password: credentials.password
			}
		};
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					return resolve(response.headers);
				} else if(response && response.statusCode == 400){
					return resolve(" ");
				} else {
					console.log("error ", error);
					return reject(error);
				}
			});
		});
	},
	//To renew the session using the access token and refresh token
	renewSession: (refreshToken) => {
		console.log("Inside the renew Session API");
		let options = {
			url: config.apiDomain + config.renewSessionURL,
			method: 'POST',
			json: {
				"refreshToken": refreshToken
			}
		};
		
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					return resolve(response.headers);
				} else if(response && response.statusCode == 400){
					return resolve(" ");
				} else {
					console.log("error ", error);
					return reject(error);
				}
			});
		});
	},
	//To get the credit limit and balance from the API
	getCreditAndBalance: (token) => {
		console.log("Inside get credit and balance API");
		let options = {
			method: 'GET',
			url: config.apiDomain + config.creditAndBalanceURL,
			headers: {
				authorization: 'Bearer ' + token, //Bearer Token
			}
		};
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					var data = JSON.parse(body);
					console.log(data.balance,data.creditLimit);
					return resolve(data);
				} else {
					return reject(error);
				}
			});
		});
	},
	//To get the card details available for the user
	getCardDetails: (token, cardId) => {
		console.log("Inside get card details API", cardId);
		let options = {
			method: 'GET',
			url: config.apiDomain + config.cardDetailsURL.replace('CARD_ID',cardId),
			headers: {
				authorization: 'Bearer ' + token, //Bearer Token
			}
		};
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					var data = JSON.parse(body);
					return resolve(data);
				} else {
					console.log("Err in card ", response.statusCode);
					return reject(error);
				}
			});
		});
	},
	//To block the user card using the card id
	blockCard: (token, cardId, cardJson) => {
		console.log("Inside block card API");
		let options = {
			url: config.apiDomain + config.blockCardURL.replace('CARD_ID',cardId),
			method: 'PUT',
			json: cardJson,
			headers: {
				authorization: 'Bearer ' + token, //Bearer Token
			}
		};
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					return resolve();
				} else {
					console.log("error ", error);
					return reject(error);
				}
			});
		});
	},
	//To get the recent transactions for the user using card id
	recentTransaction: (token) => {
		console.log("Inside the recent Transaction API");
		//For testing use date b/w 2016-01-01 to current date
		//Convert date to milliseconds
		let startDate = new Date('2016-01-01').getTime();
		let endDate = new Date().getTime();
		let options = {
			url: config.apiDomain + config.recentTransactionURL.replace('END_DATE',endDate).replace('START_DATE',startDate),
			method: 'GET',
			headers: {
				authorization: 'Bearer ' + token, //Bearer Token
			}
		};	
		console.log("URL ", options.url);	
		return new Promise((resolve, reject) => {
			requestModule(options, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					var data = JSON.parse(body);
					return resolve(data);
				} else {
					return reject(error);
				}
			});
		});
	}
};

module.exports = api;