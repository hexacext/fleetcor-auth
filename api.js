'use strict';

const requestModule = require('request'),
	config = require('./config');	

var api = {
	//To get the user details using the accessToken
	getUserDetails: (token) => {
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
				} else {
					return reject(error);
				}
			});
		});
	},
	//To get the access Token using the username and password
	getAccessToken: (credentials) => {
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
				} else {
					console.log("error ", error);
					return reject(error);
				}
			});
		});
	},
	//To get the credit limit and balance from the API
	getCreditAndBalance: (token) => {
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
					return reject(error);
				}
			});
		});
	},
	//To block the user card using the card id
	blockCard: (token, cardId, cardJson) => {
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
					var data = JSON.parse(body);
					console.log(data);
					return resolve(data);
				} else {
					console.log("error ", error);
					return reject(error);
				}
			});
		});
	}
};

module.exports = api;