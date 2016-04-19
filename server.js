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
            "type":"postback",
            "payload": "postInfo_"+post.id,
            "title":"More Info"
          },
          {
            "type":"web_url",
            "url": post.discussion_url,
            "title":"Discuss on PH"
          }         
        ]
    }
    

    return postAttachment;

}





controller.hears(['hello', 'hi'], 'message_received', function (bot, message) {

    bot.reply(message, "Hi there!");


    bot.reply(message, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
                {
                    "title": "Latest",
                    "buttons":[{
                        "type":"postback",
                        "payload": "getPosts_all",
                        "title":"More Info"
                    }]
                },
                {
                    "title": "Tech",
                    "buttons":[{
                        "type":"postback",
                        "payload": "getPosts_tech",
                        "title":"More Info"
                    }]
                },
                {
                    "title": "Games",
                    "buttons":[{
                        "type":"postback",
                        "payload": "getPosts_games",
                        "title":"More Info"
                    }]
                },
                {
                    "title": "Podcasts",
                    "buttons":[{
                        "type":"postback",
                        "payload": "getPosts_podcasts",
                        "title":"More Info"
                    }]
                },
                {
                    "title": "Books",
                    "buttons":[{
                        "type":"postback",
                        "payload": "getPosts_books",
                        "title":"More Info"
                    }]
                }
                

            ]
          }
        }
    })


})



function getHunts(bot, message, url) {

    httpGet(url, function(response) {

        var hunts = response.posts;

        var elements = [];

        for ( var i = 0; i < 10; i++ ) {
            var post = setupPostAttachment( hunts[i] );
            elements.push(post);
        }
        
        bot.reply(message, {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: elements
              }
            }
        })

    })

}








function getPostInfo(bot, message, postID) {

    var url = "https://api.producthunt.com/v1/posts/"+postID+PH_access_token;

    httpGet(url, function(response) {

        var post = response.post;


        //
        bot.reply(message, 'Some more information about "'+post.name+'"');


        // VOTES
        bot.reply(message, "It has "+post.votes_count+" votes");


        // MAKERS
        var number_of_makers = post.makers.length;

        if ( number_of_makers > 0 ) {

            var actual_number_of_makers = number_of_makers + 1;
            bot.reply(message, "There are "+ actual_number_of_makers +" makers identified");

            var makersProfiles = [];
            for ( var i = 0; i < number_of_makers; i++ ) {

                var maker = post.makers[i];
                var makerAttachment = {
                    "title": maker.name,
                    "image_url": maker.image_url.original,
                    "subtitle": maker.headline ? maker.headline : " ",
                    "buttons": [
                      {
                        "type":"web_url",
                        "url": maker.profile_url,
                        "title":"Visit Profile"
                      }        
                    ]
                }
                makersProfiles.push(makerAttachment)
            }
            bot.reply(message, {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'generic',
                    elements: makersProfiles

                  }
                }
            })

        } else {

            bot.reply(message, "No makers have been identified yet");
        }




        // MEDIA
        var number_of_media = post.media.length;
        if ( number_of_media > 0 ) {

            bot.reply(message, "Here are some images related to it");
            var mediaAttachments = [];

            for ( var i = 0; i < number_of_media; i++ ) {

                var mediaItem = post.media[i];

                if ( mediaItem.media_type == "image" ) {
                    var mediaAttachment = {
                        "title": "Media",
                        "image_url": mediaItem.image_url,

                    }
                    mediaAttachments.push(mediaAttachment)
                }
            }

            bot.reply(message, {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'generic',
                    elements: mediaAttachments

                  }
                }
            })

        }





    })

}


controller.on('facebook_postback', function (bot, message) {

    if ( message.payload.indexOf('postInfo_') > -1 ) {

        var postID = message.payload.split("_")[1];

        getPostInfo(bot, message, postID);

    }


    else if ( message.payload.indexOf('getPosts_') > -1 ) {

        var postCategory = message.payload.split("_")[1];

        if (postCategory == 'all') {

            getHunts(bot, message, "https://api.producthunt.com/v1/posts/all"+PH_access_token)

        } else {

            getHunts(bot, message, "https://api.producthunt.com/v1/categories/"+postCategory+"/posts"+PH_access_token)
        }

    }
 

})


controller.hears(['tech'], 'message_received', function (bot, message) {
    bot.reply(message, "Getting posts in the tech category");
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/tech/posts"+PH_access_token)
})
controller.hears(['games'], 'message_received', function (bot, message) {
    bot.reply(message, "Getting posts in the games category");
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/games/posts"+PH_access_token)
})
controller.hears(['podcasts'], 'message_received', function (bot, message) {
    bot.reply(message, "Getting posts in the podcasts category");
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/podcasts/posts"+PH_access_token)
})
controller.hears(['books'], 'message_received', function (bot, message) {
    bot.reply(message, "Getting posts in the books category");
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/books/posts"+PH_access_token)
})



