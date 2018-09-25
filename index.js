'use strict';

const express = require('express'),
    bodyParser = require('body-parser'),
    alexa = require('alexa-app'),
    app = express(),
    alexaApp = new alexa.app("fleetcorauth");

//create server to listen to port from the environment variable or 5000
const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

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