var Botkit = require('botkit')
var https = require("https")

var accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
var verifyToken = process.env.FACEBOOK_VERIFY_TOKEN
var port = process.env.PORT || 3000

if (!accessToken) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is required but missing')
if (!verifyToken) throw new Error('FACEBOOK_VERIFY_TOKEN is required but missing')
if (!port) throw new Error('PORT is required but missing')

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




var posts = "https://api.producthunt.com/v1/posts?access_token=f9985dd2199d08509371703c57faf5bc8d050e39f9ba0926bb13f9c15b55a254";

var getStories = function(url, callback) {
    https.get(url, function(res) {

        var body = '';

        res.on('data', function(data) {
            data = data.toString();
            body += data;
        });

        res.on('end', function() {
            body = JSON.parse(body);
            var stories = body;
            callback(stories);
        });

    }).on('error', function(err) {
        callback(null, err)
    });
}



var setupPostAttachment = function(post) {
    var postAttachment = {
        "title": post.name,
        "image_url": post.thumbnail.image_url,
        "subtitle": post.tagline,
        "buttons":[
          {
            "type":"web_url",
            "url": post.redirect_url,
            "title":"Hunt This"
          },
          {
            "type":"web_url",
            "url": post.discussion_url,
            "title":"Discuss on Product Hunt"
          }         
        ]
    

    return postAttachment;

}






controller.hears(['hello', 'hi'], 'message_received', function (bot, message) {

    getStories(posts, function(response) {

        var hunts = response.posts;
        
        bot.reply(message, {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                    setupPostAttachment( hunts[0] ),
                    setupPostAttachment( hunts[1] ),
                    setupPostAttachment( hunts[2] ),
                    setupPostAttachment( hunts[3] )
                ]

              }
            }
        })

    })


  
})

// // controller.on('facebook_postback', function (bot, message) {
// //   switch (message.payload) {
// //     case 'show_cat':
// //       bot.reply(message, {
// //         attachment: {
// //           type: 'image',
// //           payload: {
// //             url: 'https://media.giphy.com/media/5xaOcLT4VhjRfudPcS4/giphy.gif'
// //           }
// //         }
// //       })
// //       break
// //     case 'show_dog':
// //       bot.reply(message, {
// //         attachment: {
// //           type: 'image',
// //           payload: {
// //             url: 'https://media.giphy.com/media/3o7ZeL5FH6Ap9jR9Kg/giphy.gif'
// //           }
// //         }
// //       })
// //       break
// //   }
// // })
