'use strict';

const express = require('express'),
    bodyParser = require('body-parser'),
    alexa = require('alexa-app'),
    app = express(),
    alexaApp = new alexa.app("fleetcorauth"),
	api = require('./api'),
	db = require('./db');

//create server to listen to port from the environment variable or 5000
const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

//For Authentication
app.get('/login', (request, response) => {
	response.sendFile(__dirname + '/login.html');
});

//To generate the code after authorization
app.post('/generateToken', async (request, response) => {
	console.log("Inside generateToken ");
	const url = require('url');
	let urlParts = url.parse(request.headers.referer, true);
	console.log(urlParts.query);
	await api.getAccessToken(request.body).then((token) => {
		if(token == " "){
			console.log("Username and password does not match");
		} else {
			const uid = require('uid');
			let authData = {
				code: uid(),
				accessToken: token.authorization.replace('Bearer ',''),
				refreshToken: token["refresh-token"]
			};
			db.updateCode(authData).then(() => {
				response.redirect(`${urlParts.query.redirect_uri}?response_type=code&state=${urlParts.query.state}&code=${authData.code}`);
			}).catch((err) => {
				console.log("Unable to save code",err);
			});
		}
	}).catch((error) => {
		console.log("Error in accessToken ", error);
	});
});

//To send the access token using the code generated
app.post('/accessToken', async (request, response) => {
	await db.loadCode(request.body.code).then((authData) => {
		console.log("Inside auth code ", request.headers);
		if(authData == 0){
			//Change the code to refresh the token
			response.send(authData);
		} else {
			authData.token_type = "bearer";
			authData.expires_in = 3600;
			authData.scope = "profile";
			console.log("Send data ", authData);
			response.send(authData);
		}
	}).catch((err) => {
		console.log("Error in loading code ", err);
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
		await api.getUserDetails(request.getSession().details.accessToken).then((userDetails) => {
			say.push(`Hi ${userDetails.firstName} ${userDetails.lastName} <break strength="medium" />
			I am Fleetcor Assistant.<break strength="medium" />I can help you with managing your Fleetcards.
			<break strength="medium" />You may ask ‘What is my credit limit?’ or <break strength="medium" /> ‘What is my available balance?’.
			<break strength="medium" />You can stop the conversation anytime by saying end <break strength="medium" /> or stop
			<break strength="medium" />What can I do for you today`); 
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");			
			response.say(say.join('\n'));
			//By default set the following query flags to false
			response.session('isblockCard', false);
			response.session('isRecentTransactions', false);
			response.session('isExistingCard', false);
			response.session('cardId', 0);
			response.session('cardDetailsJson', {});
			db.loadSession(request.userId).then((sessionDetails) => {
				if(sessionDetails == 0){
					console.log("No session value loading card id to zero");
				} else {
					console.log("Last accessed card ", sessionDetails.cardId);
					response.session('cardId', sessionDetails.cardId);
				}
			}).catch((errors) => {
				console.log("Error in getting session details ", errors);
			});
			console.log("Before send");
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
	let say = [];
	await api.getCreditAndBalance(request.getSession().details.accessToken).then((accountDetails) => {
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
	let say = [];
	await api.getCreditAndBalance(request.getSession().details.accessToken).then((accountDetails) => {
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
	console.log("Inside block Intent ");
    response.session('isblockCard', true);
    let say = [];
	//Check if the card id is given in utterance/ user input
	if(request.data.request.intent.slots.lastFour.value){
		//cardId = request.data.request.intent.slots.lastFour.value;
		db.updateSession(request.userId, request.data.request.intent.slots.lastFour.value)
		.then(() => {
			console.log("Card Id ", request.data.request.intent.slots.lastFour.value, "saved successfully");
		}).catch((error) => {
			console.log("Error in saving card details");
		});
		await handleQuery(request.getSession().details.accessToken, say, response);
	} else {
		//Check if card id is already stored in session
		if(request.getSession().details.attributes.cardId > 0){
			response.session('isExistingCard', true);
			say = [`Sure,<break strength=\"medium\" /> Do you want to block the card with ID <say-as interpret-as='digits'> ${request.getSession().details.attributes.cardId} </say-as>`];
			response.shouldEndSession(false, `Tell me Yes <break strength=\"medium\" /> to block the card <say-as interpret-as='digits'> ${request.getSession().details.attributes.cardId} </say-as>
			<break strength=\"medium\" />or No <break strength=\"medium\" /> to check for other card`);
			response.say(say.join('\n'));
		} else {
			//Get card id from user
			response.session('isExistingCard', false);
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
    //cardId = request.data.request.intent.slots.cardNumber.value;
	db.updateSession(request.userId, request.data.request.intent.slots.cardNumber.value)
	.then(() => {
		console.log("Card Id ",request.userId, request.data.request.intent.slots.cardNumber.value, "saved successfully");
	}).catch((error) => {
		console.log("Error in saving card details");
	});
	await handleQuery(request.getSession().details.accessToken, say, response);
});

//To handle the user input - Yes
alexaApp.intent('yesIntent',async function (request, response) {
	console.log("Inside yes Intent");
    var say = [];
	if(request.getSession().details.attributes.isblockCard){
		//After completing the operation reset the flag
		response.session('isblockCard', false);
		await api.blockCard(request.getSession().details.accessToken, request.getSession().details.attributes.cardId, request.getSession().details.attributes.cardDetailsJson).then(() => {
			response.session("cardId", 0); //Once the card is blocked reset the value
			say = ["Your card has been blocked successfully <break strength=\"medium\" /> Is there anything I can help you with?"];
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
			response.say(say.join('\n'));
		}).catch((error) => {
			say = [`I am not able to complete your request at the moment.<break strength=\"medium\" /> Please try again later`];
			response.shouldEndSession(true);
			response.say(say.join('\n'));
		});
	} else if(request.getSession().details.attributes.isRecentTransactions){
		//After completing the operation reset the flag
		response.session('isRecentTransactions', false);
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
    if(request.getSession().details.attributes.isblockCard){
		if(request.getSession().details.attributes.isExistingCard){
			response.session('isExistingCard', false);
			say = ["Sure,<break strength=\"medium\" /> Please provide the ID of the card you wish to block"];
			response.shouldEndSession(false, "Tell me the ID of your card to be blocked");			
		} else {
			//After completing the operation reset the flag
			response.session('isblockCard', false);
			say = ["OK, Your card will not be blocked <break strength=\"medium\" />Is there anything I can help you with?"];
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		}
	} else if(request.getSession().details.attributes.isRecentTransactions){
		if(request.getSession().details.attributes.isExistingCard){
			response.session('isExistingCard', false);
			say = ["Sure,<break strength=\"medium\" /> Please provide the ID of the card you wish to know"];
			response.shouldEndSession(false, "Tell me the ID of your card to check the credit limit");
		} else {
			//After completing the operation reset the flag
			response.session('isRecentTransactions', false);
			say = ["OK <break strength=\"medium\" /> Is there anything I can help you with?"];
			response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
		}
	} else {
		say = [`ok <break strength=\"medium\" /> Happy to help you`];
		response.shouldEndSession(true);
	}
    response.say(say.join('\n'));
 });
 
 //To handle the recent transaction queries
alexaApp.intent('transactionsIntent', async function(request, response){
	console.log("Inside Trans Intent ");
	response.session('isRecentTransactions', true);
	let say = [];
	if(request.data.request.intent.slots.transactionNumber.value){
		cardId = request.data.request.intent.slots.transactionNumber.value;
		await handleQuery(say, response);
	} else {
		if(cardId.trim() != ""){
			response.session('isExistingCard', true);
			say = [`Sure,<break strength=\"medium\" /> Do you want to check the transactions for card ending with <say-as interpret-as='digits'> ${cardId} </say-as>`];
			response.shouldEndSession(false, `Tell me Yes <break strength=\"medium\" /> to check the transactions <say-as interpret-as='digits'> ${cardId} </say-as>
			<break strength=\"medium\" />or No <break strength=\"medium\" /> to check for other card`);
			response.say(say.join('\n'));
		} else {
			response.session('isExistingCard', false);
			say = ["Sure,<break strength=\"medium\" /> Please provide the last 4 digits of the card you wish to know"];
			response.shouldEndSession(false, "Tell me the last 4 digits of your card to check the transactions");
			response.say(say.join('\n'));			
		}
	}
});
 
 alexaApp.intent('AMAZON.StopIntent', function (request, response) {
	response.session('isblockCard', false);
	response.session('isRecentTransactions', false);
	response.session('isExistingCard', false);
	console.log("Inside stop Intent");
    let say = ["Happy to help you! Good bye"];
    response.shouldEndSession(true);
    response.say(say.join('\n'));
});

alexaApp.intent('AMAZON.HelpIntent', function (request, response) {
	console.log("Inside help Intent");
    let say = ["I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card"];
    response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
    response.say(say.join('\n'));
});

alexaApp.intent('AMAZON.CancelIntent', function (request, response) {
	response.session('isblockCard', false);
	response.session('isRecentTransactions', false);
	response.session('isExistingCard', false);
	console.log("Inside cancel Intent");
    let say = ["Happy to help you! Good bye"];
    response.shouldEndSession(true);
    response.say(say.join('\n'));
});

//To handle if user wants to end the conversation
alexaApp.intent('thankIntent', function (request, response) {
	response.session('isblockCard', false);
	response.session('isRecentTransactions', false);
	response.session('isExistingCard', false);	
	console.log("Inside thank Intent");
    var say =["<s> Happy to help you!</s><break strength=\"medium\" /> Good bye"];
    response.shouldEndSession(true);
    response.say(say.join('\n'));
});

alexaApp.intent('AMAZON.FallbackIntent', function (request, response) {
	console.log("Inside fallback Intent");
    var say =["Sorry,<break strength=\"medium\" />I cannot help you at the moment.<break strength=\"medium\" />Try again later"];
    response.shouldEndSession(true);
    response.say(say.join('\n'));
});

//To handle the queries in common
async function handleQuery(token, say, response){
	console.log("Inside handle query");
	if(request.getSession().details.attributes.isblockCard){
		console.log("Inside block card handle");
		await api.getCardDetails(token, request.getSession().details.attributes.cardId).then((cardDetails) => {
			if(cardDetails){
				response.session('cardDetailsJson', cardDetails);
				say = [`The card once blocked cannot be unblocked <break strength=\"medium\" /> it can only be re-issued <break strength=\"x-strong\" /> 
				Are you sure <break strength=\"medium\" /> you want to block the card with ID <say-as interpret-as='digits'> ${request.getSession().details.attributes.cardId} </say-as>`];
				response.shouldEndSession(false, "Say Yes to block <break strength=\"medium\" /> or No to not block the card");
				response.say(say.join('\n'));
			} else {
				//After completing the operation reset the flag
				response.session('isblockCard', false);
				say = [`Please check <break strength=\"medium\" /> There is no card with ID <say-as interpret-as='digits'> ${request.getSession().details.attributes.cardId} </say-as>
				<break strength=\"medium\" />Is there anything I can help you with?`];
				response.session("cardId", 0);
				console.log("cardId ", request.getSession().details.attributes.cardId);
				response.shouldEndSession(false, "I can help you with credit limit,<break strength=\"medium\" /> account balance <break strength=\"medium\" /> or block your card");
				response.say(say.join('\n'));
			}
		}).catch((error) => {
			console.log("Error in getting card details ", error);
			say = [`Sorry, <break strength=\"medium\" /> I am not able to answer this at the moment.<break strength=\"medium\" /> Please try again later`];
			response.shouldEndSession(true);
			response.say(say.join('\n'));
		});
	}
}