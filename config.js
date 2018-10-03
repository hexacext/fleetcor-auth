config ={
	"apiDomain"  		  : "http://simplyui-unmc-web-qa.azurewebsites.net",
	"accessTokenURL"	  : "api/sessions",
	"creditAndBalanceURL" : "api/businesses/me",
	"userProfileURL"	  : "api/users/me",
	"cardDetailsURL"	  : "api/cards/CARD_ID",
	"blockCardURL"		  : "api/cards/CARD_ID",
	"renewSessionURL"	  : "api/sessions/renew",
	"recentTransactionURL": "api/transactions?dateEnd=END_DATE&dateStart=START_DATE&index=0&limit=6&status=COMPLETE,PENDING,DECLINED"
}
module.exports = config;