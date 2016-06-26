var Botkit = require('botkit')
var https = require("https")

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




/****  OTHER EVENTS  ************************/



controller.on('message_received', function (bot, message) {
    bot.reply(message, "Sorry, I didn't get that. Say help if you need some help");

})


