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



var PH_access_token = "?access_token=f9985dd2199d08509371703c57faf5bc8d050e39f9ba0926bb13f9c15b55a254";


var httpGet = function(url, callback) {
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
    }
    

    return postAttachment;

}





controller.hears(['hello', 'hi'], 'message_received', function (bot, message) {

    bot.reply(message, "Hi there, what category are you interested in?");

    bot.reply(message, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'Which do you prefer',
            buttons: [
              {
                type: 'postback',
                title: 'Tech',
                payload: 'category_tech'
              },
              {
                type: 'postback',
                title: 'Games',
                payload: 'category_games'
              },
              {
                type: 'postback',
                title: 'Podcasts',
                payload: 'category_podcasts'
              },
              {
                type: 'postback',
                title: 'Books',
                payload: 'category_books'
              },
            ]
          }
        }
    })

})



function getHunts(bot, message, url) {

    bot.reply(message, "hunting...");

    httpGet(url, function(response) {

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
                    setupPostAttachment( hunts[3] ),
                    setupPostAttachment( hunts[4] )
                ]

              }
            }
        })

    })

}



controller.on('facebook_postback', function (bot, message) {
  switch (message.payload) {
    case 'category_tech':
        getHunts(bot, message, "https://api.producthunt.com/v1/categories/tech/posts"+PH_access_token)
        break
    case 'category_games':
        getHunts(bot, message, "https://api.producthunt.com/v1/categories/games/posts"+PH_access_token)
        break
    case 'category_podcasts':
        getHunts(bot, message, "https://api.producthunt.com/v1/categories/podcasts/posts"+PH_access_token)
        break
    case 'category_books':
        getHunts(bot, message, "https://api.producthunt.com/v1/categories/books/posts"+PH_access_token)
        break

  }
})



