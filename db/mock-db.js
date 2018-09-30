var Promise = require('bluebird'),
    data = require('./mock-data.json')
	authorize = require('./auth-data.json');

module.exports = {
    label: 'mock',

    loadUserSession: (userId) => {
        console.log('mock-db.loadSession '+userId);
        return new Promise((resolve) => {
			console.log(data.users[userId]);
            return resolve(data.users[userId]);
        });
    },

    saveUserSession: (userId, session) => {
        console.log('mock-db.saveSession '+userId);
        return new Promise((resolve) => {
            var saved = data.users[userId] || {};
            return resolve(Object.assign(saved, session));
        });
    },

    loadCode: (code) => {
		return new Promise((resolve) => {
			return resolve(code.users[code]);
		});
	},
	
	saveCode: (code, authData) => {
		return new Promise((resolve) => {
			var saved = code.users[code] || {};
			return resolve(Object.assign(saved, authData));
		});
	}
};
