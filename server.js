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
  var reply = "Oops, looks like there was an error";
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

	var url = 'https://en.wikipedia.org/wiki/'+item.title;
	url = url.replace(/ /g, "_");

	var attachment = {
		'title': item.title,
		'subtitle': 'Subtitle',
		'buttons':[
			{
				'type':'postback',
				'payload': 'postInfo_',
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
	.then(function(results) {

		results = results.query.search;

		var elements = [];

		for ( var i = 0; i < 10; i++ ) {

			if ( !results[i] ) { break; }
			elements.push( setupAttachment(results[i]) );
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

		bot.reply(message, reply);


	});

    
    
};




/* *****************************

    CONTROLLER

***************************** */

// controller.hears(["list"], 'message_received', function(bot, message) {

//   var messageText = message.text.toLowerCase();

//   if ( messageText.indexOf("todo") > -1 ) {
//     listTodos(bot, message, "todo");
//   } else if ( messageText.indexOf("done") > -1 ) {
//     listTodos(bot, message, "done");
//   } else {
//     listTodos(bot, message, "all");
//   }
// })

// controller.hears("todo", 'message_received', function(bot, message) {
//   createTodo(bot, message);
// })


controller.on('message_received', function (bot, message) {

	bot.reply(message, 'Searching...');

	search(bot, message);

});


