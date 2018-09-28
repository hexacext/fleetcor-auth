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
var isblockCard = false;
var isRecentTransactions = false;
var isExistingCard = false;
var cardId = "";

//For Authentication
app.get('/login', (request, response) => {
	response.sendFile(__dirname + '/login.html');
});

//For implicit Grant Type
/*app.post('/generateToken', async (request, response) => {
	console.log("Inside generateToken ", request.body, request.query);
	//console.log("header url ",request.headers.referer);
	const url = require('url');
	let urlParts = url.parse(request.headers.referer, true);
	console.log(urlParts.query);
	await getAccessToken(request.body).then((token) => {
		console.log("Before redirect ");
		response.redirect(urlParts.query.redirect_uri+"#state="+urlParts.query.state+"&token_type=Bearer&access_token="+token.authorization.replace('Bearer ',''));
	}).catch((error) => {
		console.log("Error in accessToken ", error);
	});
});*/

//For Auth code Grant Type
//To generate the code after authorization
app.post('/generateToken', async (request, response) => {
	console.log("Inside generateToken ");
	const url = require('url');
	let urlParts = url.parse(request.headers.referer, true);
	console.log(urlParts.query);
	await getAccessToken(request.body).then((token) => {
		response.redirect(urlParts.query.redirect_uri+"?response_type=code&state="+urlParts.query.state+"&code=SplxlOBeZQQYbYS6WxSbIA");
	}).catch((error) => {
		console.log("Error in accessToken ", error);
	});
});

//To generate the access token using the code generated
app.post('/accessToken', async (request, response) => {
	request.body = {
		username: 'AK037',
		password: 'Password@1'
	};
	await getAccessToken(request.body).then((token) => {
		console.log("Token ", token);
		let details = {
		  "access_token" : token.authorization.replace('Bearer ',''),
		  "token_type" : "bearer",
		  "expires_in" : 360,
		  "refresh_token" : token["refresh-token"],
		  "scope" : "profile"
		};
		console.log("Completed ", details);
		response.send(details);
	}).catch((error) => {
		console.log("Error in accessToken ", error);
	});
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
alexaApp.launch(async (request, response) => {
    console.log('Session Obj ' + JSON.stringify(request.getSession()));
    let say = [];
	if (request.getSession().details.accessToken) {
		await getUserDetails(request.getSession().details.accessToken).then((userDetails) => {
			say.push(`Hi ${userDetails.firstName} ${userDetails.lastName} <break strength="medium" />
			I am Fleetcor Assistant.<break strength="medium" />I can help you with managing your Fleetcards.
			<break strength="medium" />You may ask ‘What is my credit limit?’ or <break strength="medium" /> ‘What is my available balance?’.
			<break strength="medium" />You can stop the conversation anytime by saying end <break strength="medium" /> or stop
			<break strength="medium" />What can I do for you today`); 
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");			
			response.say(say.join('\n'));
			response.send();
		}).catch((error) => {
			console.log("Error in acc link ", error);
			response.say('<s>There was a problem with account linking.<break strength="medium" /> Please try again later</s>');
			response.shouldEndSession(true);
			response.send();
		});
	} else {
		response.card(alexaApp.accountLinkingCard());
		response.say('<s>FleetCor Assistant requires you to link your FleetCor account</s>');
		response.shouldEndSession(true);
	}
});

//To handle the queries related to the unblocking a card
alexaApp.intent('unblockCardIntent', function (request, response) {
	console.log("Inside unblock Intent");
    let say = [`Sorry <break strength=\"medium\" /> The card once blocked cannot be unblocked.<break strength=\"medium\" /> You will have to place request to reissue a new card.<break strength=\"medium\" /> Is there anything I can help you with`];
    response.shouldEndSession(false);
    response.say(say.join('\n'));
});

//To handle the credit limit queries
alexaApp.intent('creditLimitIntent', async (request, response) => {
	console.log("Inside CL Intent");
	isCreditLimit = true;
    let say = [];
	await getCreditAndBalance(request.getSession().details.accessToken).then((accountDetails) => {
		say = [`The credit Limit for your account is <break strength="medium" /> $ ${accountDetails.creditLimit} <break strength="medium" />Is there anything I can help you with?`];
		response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		response.say(say.join('\n'));
	}).catch((error) => {
		console.log("Error in getting Credit Limit ", error);
		say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
		response.shouldEndSession(true);
		response.say(say.join('\n'));
	});
});

//To handle the account balance queries
alexaApp.intent('accountBalanceIntent',async (request, response) => {
	console.log("Inside AB Intent ");
	isAccountBalance = true;
	let say = [];
	await getCreditAndBalance(request.getSession().details.accessToken).then((accountDetails) => {
		say = [`The balance in your account is <break strength="medium" /> $ ${accountDetails.balance} <break strength="medium" />Is there anything I can help you with?`];
		response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		response.say(say.join('\n'));
	}).catch((error) => {
		console.log("Error in getting balance ", error);
		say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
		response.shouldEndSession(true);
		response.say(say.join('\n'));
	});
});

//To handle the block card queries
alexaApp.intent('blockCardIntent', async function (request, response) {
	console.log("Inside block Intent");
    isblockCard = true;
    let say = [];
	//Check if the card id is given in utterance/ user input
	if(request.data.request.intent.slots.lastFour.value){
		cardId = request.data.request.intent.slots.lastFour.value;
		await handleQuery(request.getSession().details.accessToken, say, response);
	} else {
		//Check if card id is already stored in session
		if(cardId.trim() != ""){
			isExistingCard = true;
			say = [`Sure,<break strength=\"medium\" /> Do you want to block the card with ID <say-as interpret-as='digits'> ${cardId} </say-as>`];
			response.shouldEndSession(false, `Tell me Yes <break strength=\"medium\" /> to block the card <say-as interpret-as='digits'> ${cardId} </say-as>
			<break strength=\"medium\" />or No <break strength=\"medium\" /> to check for other card`);
			response.say(say.join('\n'));
		} else {
			//Get card id from user
			isExistingCard = false;
			say = ["Sure,<break strength=\"medium\" /> Please provide the ID for the card you wish to block"];
			response.shouldEndSession(false, "Tell me the ID for the card to be blocked");
			response.say(say.join('\n'));
		}
	}
});

 //To get the card id
alexaApp.intent('cardNumberIntent', async function (request, response) {
	console.log("Inside CN Intent");
    var say = [];
    console.log(request.data.request.intent.slots.cardNumber.value)
    cardId = request.data.request.intent.slots.cardNumber.value;
	await handleQuery(request.getSession().details.accessToken, say, response);
});

//To handle the user input - Yes
alexaApp.intent('yesIntent',async function (request, response) {
	console.log("Inside yes Intent");
    var say = [];
	if(isblockCard){
		//After completing the operation reset the flag
		isblockCard = false;
	} else if(isRecentTransactions){
		//After completing the operation reset the flag
		isRecentTransactions = false;
	} else {
		let say = ["I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card"];
		response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		response.say(say.join('\n'));
	}
 });

 //To handle the user input - No
 alexaApp.intent('noIntent', function (request, response) {
	 console.log("Inside no Intent");
	var say = [];
    if(isblockCard){
		if(isExistingCard){
			isExistingCard = false;
			say = ["Sure,<break strength=\"medium\" /> Please provide the ID of the card you wish to block"];
			response.shouldEndSession(false, "Tell me the ID of your card to be blocked");			
		} else {
			//After completing the operation reset the flag
			isblockCard = false;
			say = ["OK, Your card will not be blocked <break strength=\"medium\" />Is there anything I can help you with?"];
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		}
	} else if(isRecentTransactions){
		if(isExistingCard){
			isExistingCard = false;
			say = ["Sure,<break strength=\"medium\" /> Please provide the ID of the card you wish to know"];
			response.shouldEndSession(false, "Tell me the ID of your card to check the credit limit");
		} else {
			//After completing the operation reset the flag
			isRecentTransactions = false;
			say = ["OK <break strength=\"medium\" /> Is there anything I can help you with?"];
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		}
	} else {
		say = [`ok <break strength=\"medium\" /> Happy to help you`];
		response.shouldEndSession(true);
	}
    response.say(say.join('\n'));
 });

async function handleQuery(token, say, response){
	if(isblockCard){
		await getCardDetails(token).then((cardArray) => {
			console.log(cardArray.length);
			say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
			response.shouldEndSession(true);
			response.say(say.join('\n'));
		}).catch((error) => {
			console.log("Error in getting card details ", error);
			say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
			response.shouldEndSession(true);
			response.say(say.join('\n'));
		});
	}
}

//To get the card details available for the user
function getCardDetails(token){
	let options = {
		method: 'GET',
        url: config.apiDomain + config.cardDetailsURL,
        headers: {
            authorization: 'Bearer ' + token, //Bearer Token
        }
	};
	return new Promise((resolve, reject) => {
        requestModule(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var data = JSON.parse(body);
                console.log(data);
                return resolve(data);
            } else {
                return reject(error);
            }
        });
    });
}

//To block the user card using the card id
function blockCard(token, cardJson){
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

//To get the credit limit and balance from the API
function getCreditAndBalance (token){
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
}

//To get the access Token using the username and password
function getAccessToken(credentials){
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
				//console.log("res ",response.headers.authorization);
				//console.log("body",body);
				return resolve(response.headers);
			} else {
				console.log("error ", error);
				return reject(error);
			}
		});
	});
}

//To get the user details using the accessToken
function getUserDetails(token){
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
}