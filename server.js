/*eslint-disable */

/* *****************************

    SETUP BOT AND CONTROLLER

***************************** */

var Botkit = require('botkit');
var https = require('https');

var accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
var verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
var port = process.env.PORT;

if (!accessToken) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is required but missing');
if (!verifyToken) throw new Error('FACEBOOK_VERIFY_TOKEN is required but missing');
if (!port) throw new Error('PORT is required but missing');

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
}; // end fetch

var botReply = function(bot, message, reply) {
	return new Promise(function(resolve, reject) {
		bot.reply(message, reply, function(err, response) {
			if ( err ) reject(err);
			resolve(response);
		});
	});
}; // end botReply


var handleError = function(bot, message, err) {
	console.log(err);

	botReply(bot, message, 'Uh oh, this is embarassing.. Looks like there was an error. Here are the details -')
	.then(function() {
		return botReply(bot, message, '"'+err+'"');
	})
	.then(function() {
		return botReply(bot, message, 'You may want to contact my creator, ire@ireaderinokun.com');
	})
};


var getParts = function(chunk, numberOfParts) {

	chunk = chunk.substring(0, 960);

	var partMaxLength = 320; // Max number of characters in a message

	var parts = [];

	var start = 0;
	var end = partMaxLength;

	function getPart() {

		if ( end > chunk.length && end !== partMaxLength ) { return; }

		var part = chunk.substring(start, end);
		var sentenceEndIndex = start + part.lastIndexOf('.') + 1;
		part = chunk.substring(start, sentenceEndIndex);

		parts.push(part);

		start = sentenceEndIndex;
		end = start + partMaxLength;
	}

	for (var i = 0; i < numberOfParts; i++) {
		getPart();
	}

	return parts;
};




/* *****************************

    🌐 WIKIBOT 🌐

    This is where the magic happens!

***************************** */


/*  SEARCH ---------------------- */

function Search(bot, message) {
	this._init(bot, message);
}

Search.prototype._setupTemplateItem = function(item) {

	var titleWithUnderscores = item.title.replace(/ /g, '_');
	var url = 'https://en.wikipedia.org/wiki/'+titleWithUnderscores;
	var subtitle = item.snippet;
		subtitle = subtitle.replace(/<span class="searchmatch">/g, '');
		subtitle = subtitle.replace(/<\/span>/g, '');
		subtitle = subtitle.replace(/&quot;/g, '');
		subtitle = subtitle.substring(0, 75) + '...';

	var item = {
		'title': item.title,
		'subtitle': subtitle,
		'buttons':[
			{
				'type':'postback',
				'payload': 'summary_'+titleWithUnderscores,
				'title':'Get Summary'
			},
			{
				'type':'web_url',
				'url': url,
				'title':'Visit Page'
			}         
		]
	}; // end item

	return item;
};

Search.prototype._getSearchReply = function(query, response, prototype) {

	var searchResults = response.query.search;

	if ( searchResults.length === 0 ) {
		return Promise.resolve('Sorry, there was nothing found on Wikipedia about "' + query + '"');
	}

	var elements = [];

	for ( var i = 0; i < 10; i++ ) {
		if ( !searchResults[i] ) { break; }
		elements.push( prototype._setupTemplateItem(searchResults[i]) );
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
};


Search.prototype._init = function(bot, message) {

	var prototype = this;

	var query = message.text;
	var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURI(query) + '&srprop=timestamp|snippet&utf8=&format=json';

	fetch(url)
	.then(function(response) {
		return prototype._getSearchReply(query, response, prototype);
	})
	.then(function(reply) {
		return botReply(bot, message, reply);
	})
	.catch(function(err) {
		handleError(bot, message, err);
	});

};








/*  SUMMARY FOR PAGE ---------------------- */

function Summary(bot, message) {
	this._init(bot, message);
}

Summary.prototype._getExtract = function(bot, message, result) {
	return new Promise(function(resolve, reject) {
		
		var parts = getParts(result.extract, 3);

		var sequence = Promise.resolve();

		parts.forEach(function(part) {

			var reply = part;

			sequence = sequence.then(function() {
				return botReply(bot, message, reply);
			});
		});

		sequence = sequence.then(function() {
			resolve(result);
		});

	});
}

Summary.prototype._getCTA = function(bot, message, result) {
	return new Promise(function(resolve, reject) {

		var titleWithUnderscores = result.title.replace(/ /g, '_');
		var url = 'https://en.wikipedia.org/wiki/'+titleWithUnderscores;

		var reply = {
			attachment: {
				type: 'template',
				payload: {
					template_type: 'button',
					text: 'Would you like to read more?',
					buttons: [
						{
							type: 'web_url',
							url: url,
							title: 'View on Wikipedia'
						}
					]
				}
			}
		}; // end reply

		bot.reply(message, reply, function(err) {
			if ( err ) reject(err);
			resolve(result);
		});

	});
};


Summary.prototype._init = function(bot, message) {

	var prototype = this;

	var pageTitle = message.payload.split('summary_')[1];
	var pageTitleUrlEncoded = pageTitle.replace(/_/g, '%20');
	var pageTitleNormal = pageTitle.replace(/_/g, ' ');

	bot.reply(message, 'Getting a summary for "' + pageTitleNormal + '"...');
	
	var url = 'https://en.wikipedia.org/w/api.php?action=query&utf8=&format=json&titles='+pageTitleUrlEncoded+'&prop=extracts&explaintext=&exintro=';

	fetch(url)
	.then(function(response) {
		var pages = response.query.pages;
		var result = pages[Object.keys(pages)[0]];
		return Promise.resolve(result);
	})
	.then(function(result) {
		return prototype._getExtract(bot, message, result);
	})
	.then(function(result) {
		return prototype._getCTA(bot, message, result);
	})
	.catch(function(err) {
		handleError(bot, message, err);
	});
}









/* *****************************

    CONTROLLER

***************************** */


controller.hears('help', 'message_received', function(bot, message) {

	botReply(bot, message, "Look's like you need help!")
	.then(function() {
		return botReply(bot, message, "Well I'm a very simple bot, sort of like a search engine. Just type in whatever you are looking for on Wikipedia, and I'll do the search for you.");
	})
	.then(function() {
		return botReply(bot, message, "Try it out, just say 'Brexit'");
	});

});

controller.on('message_received', function (bot, message) {

	if ( message.text.indexOf('summary_') > -1 ) { return; }

	bot.reply(message, 'Searching Wikipedia for "'+message.text+'"');
	new Search(bot, message);
});



controller.on('facebook_postback', function (bot, message) {

	var postbackType = message.payload;
	postbackType = postbackType.split('_')[0];

	switch(postbackType) {
	case 'summary':
		new Summary(bot, message);
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


