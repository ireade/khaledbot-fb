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

    HELPER FUNCTIONS

***************************** */

var handleError = function(bot, message, err) {
  console.log(err);
  var reply = "Oops, looks like there was an error";
  bot.reply(message, reply);
}


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
      bot.reply(message, "I've added &quot;"+todoText+"&quot; to your todos. Say &quot;list&quot; to see your todos");
    });

}




/*  READ (ALL) ---------------------- */

var getTodosList = function(userID) {
  return new Promise(function(resolve, reject) {

    // Create empty array for todos
    var todos = [];

    // Check if there is a value
    firebase.database().ref('todos/' + userID).on("value", function(snapshot) {
      if ( !snapshot.val() ) { resolve(todos) }
    })

    // Get array
    firebase.database().ref('todos/' + userID).on("child_added", function(snapshot) {
      // Push to the todos array
      todos.push( snapshot.val() )
      resolve(todos)
    });

  })
}


var getTodoTemplate = function(todo) {

  return {
    "title": todo.text,
    "subtitle": todo.completed ? "Completed" : "Incomplete",
    "buttons": [
      {
        "type":"postback",
        "payload": "postInfo_",
        "title":"Mark as Done"
      }        
    ]
  }

}


var listTodos = function(bot, message, type) {
  return new Promise(function(resolve, reject) { 

    getTodosList(message.user).then(function(todos) {

      var todoList = "";
      var pretext = "";

      var todoAttachments = [];

      // Loop through all todos
      for ( var i = 0; i < todos.length; i++ ) {

        todoAttachments.push( todos[i] );
      } 


      // if ( todoList == "" ) {
      //   todoList = "Looks like you haven't got any todos yet. Say `todo [Task]` to add one. For example, `todo Be awesome`"
      // }


      var reply = {
        attachment: {
          type: 'template',
          payload: {
          template_type: 'generic',
          elements: todoAttachments
          }
        }
      }

      bot.reply(message, reply, function(err) {
        if (err) return handleError(bot, message, err);

        if ( todoAttachments.length > 0 ) {
          bot.reply(message, "Say `done [task index]` to mark a todo as completed, or `delete [task index]` to delete it");
        }
          
      });

    }) // end getTodosList

  })
}






/* *****************************

    CONTROLLER

***************************** */

controller.hears(["list"], 'message_received', function(bot, message) {

  var messageText = message.text.toLowerCase();

  if ( messageText.indexOf("todo") > -1 ) {
    listTodos(bot, message, "todo");
  } else if ( messageText.indexOf("done") > -1 ) {
    listTodos(bot, message, "done");
  } else {
    listTodos(bot, message, "all");
  }
})

controller.hears("todo", 'message_received', function(bot, message) {
  createTodo(bot, message);
})


controller.on('message_received', function (bot, message) {
    console.log(message);
    bot.reply(message, "Hello, world!");
})


