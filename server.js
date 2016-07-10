/*eslint-env node */

var Botkit = require('botkit');
var https = require('https');

// var firebase = require('firebase');
// var moment = require('moment');

var accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
var verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
var port = process.env.PORT;

if (!accessToken) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is required but missing');
if (!verifyToken) throw new Error('FACEBOOK_VERIFY_TOKEN is required but missing');
if (!port) throw new Error('PORT is required but missing');


/* *****************************

    SETUP BOT AND CONTROLLER

***************************** */

var controller = Botkit.facebookbot({
	access_token: accessToken,
	verify_token: verifyToken
});

var bot = controller.spawn();

controller.setupWebserver(port, function (err, webserver) {
	if (err) return console.log(err);
	controller.createWebhookEndpoints(webserver, bot, function () {
		console.log('Ready Player 1');
	});
});

/* SETUP FIREBASE */
// firebase.initializeApp({
// 	serviceAccount: 'todobot-new-9c94bc621a3c.json',
// 	databaseURL: 'https://todobot-new.firebaseio.com'
// });


///





/* *****************************

    HELPER FUNCTIONS

***************************** */

var handleError = function(bot, message, err) {
	console.log(err);
	var reply = 'Oops, looks like there was an error';
	bot.reply(message, reply);
};


var fetch = function(url) {
	return new Promise(function(resolve, reject) {

		https.get(url, function(res) {

			var body = '';

			res.on('data', function(data) {
				data = data.toString();
				body += data;
			});

			res.on('end', function() {
				body = JSON.parse(body);
				resolve(body);
			});

		}).on('error', function(err) {
			reject(err);
		});

	});
};


/* *****************************

    CRUD

***************************** */


var setupAttachment = function(item) {

	var titleWithUnderscores = item.title;
	titleWithUnderscores = titleWithUnderscores.replace(/ /g, '_');

	var url = 'https://en.wikipedia.org/wiki/'+titleWithUnderscores;

	var subtitle = item.snippet;
	subtitle = subtitle.replace('<span class="searchmatch">', '');
	subtitle = subtitle.replace('</span>', '');
	subtitle = subtitle.substring(0, 79);

	var attachment = {
		'title': item.title,
		'subtitle': subtitle,
		'buttons':[
			{
				'type':'postback',
				'payload': 'summary_'+titleWithUnderscores,
				'title':'Summary'
			},
			{
				'type':'web_url',
				'url': url,
				'title':'Visit Page'
			}         
		]
	};

	return attachment;

};




/*  UPDATE (Mark as Complete) ---------------------- */




var search = function(bot, message) {

	var query = message.text;
	query = encodeURI(query);

	var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch='+query+'&srprop=timestamp|snippet&utf8=&format=json';


	fetch(url)
	.then(function(response) {

		var searchResults = response.query.search;

		if ( searchResults.length === 0 ) {
			return Promise.resolve('Looks like nothing was found for your search...');
		}

		var elements = [];

		for ( var i = 0; i < 10; i++ ) {
			if ( !searchResults[i] ) { break; }
			elements.push( setupAttachment(searchResults[i]) );
		}

		var reply = {
			attachment: {
				type: 'template',
				payload: {
					template_type: 'generic',
					elements: elements
				}
			}
		};

		return Promise.resolve(reply);

	})
	.then(function(reply) {

		bot.reply(message, reply);

	});
    
    
};




/* *****************************

    CONTROLLER

***************************** */


controller.hears('help', 'message_received', function(bot, message) {

	bot.reply(message, 'You need help');

});


controller.on('message_received', function (bot, message) {

	bot.reply(message, 'Searching...');
	search(bot, message);

});


controller.on('facebook_postback', function (bot, message) {

	var postbackType = message.payload;
	postbackType = postbackType.split('_')[0];

	switch(postbackType) {
	case 'summary':
		var reply = 'summary postback';
		bot.reply(message, reply);
		break;

	default:
		var reply = 'Oops';
		bot.reply(message, reply);
	}


});




controller.on('facebook_optin', function (bot, message) {
	var reply = 'Welcome! I have some products for you';
	bot.reply(message, reply, function(err) {
		if (err) handleError(bot, message, err);
	});

});


