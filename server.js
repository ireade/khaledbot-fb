/*eslint-env node */

var Botkit = require('botkit');
var https = require('https');

// var firebase = require('firebase');
var moment = require('moment');

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
		console.log('Controller Ready');
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

var handleError = function(bot, message, err) {
	console.log(err);
	var reply = 'Oops, looks like there was an error - "' + err + '"';
	bot.reply(message, reply);
};

var momentDate = function(rawDate) {

	var date = rawDate.split('T')[0];

	var m = moment(date).calendar(null, {
		sameElse: 'ddd Do MMM YYYY'
	});

	return m;
};


/* *****************************

    WIKI

***************************** */

var setupAttachment = function(item) {

	var titleWithUnderscores = item.title;
	titleWithUnderscores = titleWithUnderscores.replace(/ /g, '_');

	var url = 'https://en.wikipedia.org/wiki/'+titleWithUnderscores;

	var subtitle = item.snippet;
	subtitle = subtitle.replace(/<span class="searchmatch">/g, '');
	subtitle = subtitle.replace(/<\/span>/g, '');
	subtitle = subtitle.replace(/&quot;/g, '');
	subtitle = subtitle.substring(0, 75) + '...';

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




/*  SEARCH ---------------------- */


var search = function(bot, message) {

	var query = message.text;
	query = encodeURI(query);

	var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch='+query+'&srprop=timestamp|snippet&utf8=&format=json';

	fetch(url)
	.then(function(response) {

		var searchResults = response.query.search;

		if ( searchResults.length === 0 ) {
			return Promise.resolve('Sorry, there was nothing found on Wikipedia about "'+query+'"');
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
	})
	.catch(function(err) {
		handleError(bot, message, err);
	});
    
    
};




/*  SUMMARY FOR PAGE ---------------------- */

var summarize = function(bot, message) {

	var page = message.payload.split('summary_')[1];

	var pageTitleUrlEncoded = page.replace(/_/g, '%20');
	var pageTitleNormal = page.replace(/_/g, ' ');


	bot.reply(message, 'Getting a summary for "' + pageTitleNormal + '"');
	
	var url = 'https://en.wikipedia.org/w/api.php?action=query&utf8=&format=json&prop=revisions&titles='+pageTitleUrlEncoded+'&rvprop=content|timestamp|user&rvlimit=1&rvparse=true&rvsection=0';

	fetch(url)
	.then(function(response) {

		// 1- GET REVISION OBJECT

		var pages = response.query.pages;
		var result = pages[Object.keys(pages)[0]];
		return Promise.resolve(result);

	})
	.then(function(result) {

		// 2- GET BASIC SUMMARY
		console.log(result);

		var revision = result.revisions[0];

		var title = result.title;
		var reply = 'Summary here for - '+title;

		bot.reply(message, reply, function(err) {
			return Promise.resolve(result);
		});

	})
	.then(function(result) {

		bot.reply(message, 'Revision author next');

		// GET REVISION AUTHOR
		var revision = result.revisions[0];

		if ( revision.anon ) {
			return Promise.resolve(result);
		}

		//var rawDate = revision.timestamp;

		var reply = 'This was last edited by ' + revision.user;

		bot.reply(message, reply, function(err, response) {
			return Promise.resolve(result);
		});

	})
	.then(function(result) {

		bot.reply(message, 'Buttons next');

		// BUTTONS
		var revision = result.revisions[0];

		
		var titleWithUnderscores = result.title;
		titleWithUnderscores = titleWithUnderscores.replace(/ /g, '_');

		var url = 'https://en.wikipedia.org/wiki/'+titleWithUnderscores;


		var reply = {
			attachment: {
				'type': 'template',
				'payload': {
					'template_type': 'button',
					'text': 'Would you like to read more?',
					'buttons': [
						{
							'type': 'web_url',
							'url': url,
							'title': 'View on Wikipedia'
						}
					]
				}
			}
		};

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

	if ( message.text.indexOf('summary_') > -1 ) { return; }

	bot.reply(message, 'Searching Wikipedia for "'+message.text+'"');
	search(bot, message);

});



controller.on('facebook_postback', function (bot, message) {

	var postbackType = message.payload;
	postbackType = postbackType.split('_')[0];

	switch(postbackType) {
	case 'summary':
		summarize(bot, message);
		break;
	default:
		var err = 'Uh oh! Looks like there was a problem';
		handleError(bot, message, err);
	}

});



controller.on('facebook_optin', function (bot, message) {
	var reply = 'Welcome!!';
	bot.reply(message, reply);
});


