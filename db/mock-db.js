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
		console.log("code in session ",code);
		return new Promise((resolve) => {
			return resolve(code.users[code]);
		});
	},
	
	saveCode: (code, authData) => {
		return new Promise((resolve, reject) => {
			let json = authorize;
			json.users[code] = authData;
			json = JSON.stringify(json);
			console.log("String ",json);
			require('fs').writeFile('./auth-data.json', json, 'utf-8', (err) => {
				if(err){
					//console.log("Err in saveCode ", err);
					return reject(err);
				} else {
					return resolve();
				}
			});
		});
	}
};
