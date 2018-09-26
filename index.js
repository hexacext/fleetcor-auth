'use strict';

const express = require('express'),
    bodyParser = require('body-parser'),
    alexa = require('alexa-app'),
    app = express(),
    alexaApp = new alexa.app("fleetcorauth"),
	requestModule = require('request'),
	config = require('./config');

//create server to listen to port from the environment variable or 5000
const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

var isCreditLimit = false;
var isAccountBalance = false;

app.get('/login', (request, response) => {
	//console.log(request);
	response.sendFile(__dirname + '/login.html');
});

app.post('/generateToken', (request, response) => {
	console.log("Inside generateToken ", request.body);
	console.log("header url ",request.headers.referer);
	const url = require('url');
	let urlParts = url.parse(request.headers.referer, true);
	console.log(urlParts.query);
});

//To connect the Alexa to express app
alexaApp.express({
    expressApp: app,
    checkCert: false
});

alexaApp.error = function (e, req, res) {
	console.log("Error in Alexa");
    console.log(e);
    console.log(req);
    throw e;
};

//Account linking card
alexaApp.accountLinkingCard = function () {
    var card = {
        type: "LinkAccount"
    }
    return card;
}

//Welcome or start Intent
alexaApp.launch(function (request, response) {
    console.log('Session Obj ' + JSON.stringify(request.getSession()));
    let say = [];
	if (request.getSession().details.accessToken) {
		response.say('<s>Hi I am Fleetcor Assistant</s>');
		response.shouldEndSession(false);
	} else {
		response.card(alexaApp.accountLinkingCard());
		response.say('<s>FleetCor Assistant requires you to link your Amazon account</s>');
		response.shouldEndSession(true);
	}
});

//To handle the queries related to the unblocking a card
alexaApp.intent('unblockCardIntent', function (request, response) {
	console.log("Inside unblock Intent");
    let say = [`Sorry <break strength=\"medium\" /> The card once blocked cannot be unblocked.<break strength=\"medium\" /> You will have to place request to reissue a new card.<break strength=\"medium\" /> Is there anything I can help you with`];
    response.shouldEndSession(false, "");
    response.say(say.join('\n'));
});

//To handle the credit limit queries
alexaApp.intent('creditLimitIntent', async (request, response) => {
	console.log("Inside CL Intent");
	isCreditLimit = true;
    let say = [];
	await getCreditAndBalance(token).then((accountDetails) => {
		//console.log(accountDetails.creditLimit);
		say = [`The credit Limit for your account is <break strength="medium" /> $ ${accountDetails.creditLimit} <break strength="medium" />Is there anything I can help you with?`];
		response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		response.say(say.join('\n'));
	}).catch((error) => {
		say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
		response.shouldEndSession(true);
		response.say(say.join('\n'));
	});
});

//To handle the account balance queries
alexaApp.intent('accountBalanceIntent',async (request, response) => {
	console.log("Inside AB Intent ", lastFour);
	isAccountBalance = true;
	let say = [];
	await getCreditAndBalance(token).then((accountDetails) => {
		//console.log(accountDetails.balance);
		say = [`The balance in your account is <break strength="medium" /> $ ${accountDetails.balance} <break strength="medium" />Is there anything I can help you with?`];
		response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		response.say(say.join('\n'));
	}).catch((error) => {
		say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
		response.shouldEndSession(true);
		response.say(say.join('\n'));
	});
});

//To get the credit limit and balance from the API
function getCreditAndBalance (token){
	let options = {
		method: 'GET',
        url: config.APIDomain + config.creditAndBalanceURL,
        headers: {
            authorization: token, //Bearer Token
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
}