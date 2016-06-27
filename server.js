var Botkit = require('botkit')
var firebase = require('firebase')
var moment = require('moment')

var accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
var verifyToken = process.env.FACEBOOK_VERIFY_TOKEN
var port = process.env.PORT

if (!accessToken) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is required but missing')
if (!verifyToken) throw new Error('FACEBOOK_VERIFY_TOKEN is required but missing')
if (!port) throw new Error('PORT is required but missing')


/* *****************************

    SETUP BOT AND CONTROLLER

***************************** */

var controller = Botkit.facebookbot({
  access_token: accessToken,
  verify_token: verifyToken
})

var bot = controller.spawn()

controller.setupWebserver(port, function (err, webserver) {
  if (err) return console.log(err)
  controller.createWebhookEndpoints(webserver, bot, function () {
    console.log('Ready Player 1')
  })
})

/* SETUP FIREBASE */
firebase.initializeApp({
  serviceAccount: "todobot-new-9c94bc621a3c.json",
  databaseURL: "https://todobot-new.firebaseio.com"
})


///

var todos = [];



/* *****************************

    CRUD

***************************** */

/*  CREATE ---------------------- */

var createTodo = function(bot, message) {

  // Get the task text
  var todoText = message.text.split("todo ")[1] || message.text.split("Todo ")[1] || null;

  // Handle error if no task text is present
  if (!todoText) return handleError(bot, message, "There was no task specified. Say `todo [Task to do]`. For example, `todo Pick up my laundry`");

  // Create new todo
    var newTodo = {
      text: todoText,
      completed: false,
      dateAdded: firebase.database.ServerValue.TIMESTAMP,
      dateCompleted: null
    }

    // Push to database
    firebase.database().ref('todos/' + message.user).push(newTodo, function(err) {
      if (err) return handleError(bot, message, err);

      // Success message
      bot.reply(message, "I've added *"+todoText+"* to your todos. Say `list` to see your todos");
    });

}



/* *****************************

    CONTROLLER

***************************** */

controller.hears("todo", contexts, function(bot, message) {
  createTodo(bot, message);
})


controller.on('message_received', function (bot, message) {
    console.log(message);
    bot.reply(message, "Hello, world!");
})


