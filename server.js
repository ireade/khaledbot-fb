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




/* *****************************

    CHOOSE CATEGORY

***************************** */

var chooseCategoryPrompt = function(bot, message) {

    var reply = "Choose a category...";

    bot.reply(message, reply, function(err, response) {

        bot.reply(message, {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                    {
                        "title": "Tech",
                        "buttons":[{
                            "type":"postback",
                            "payload": "getPosts_tech",
                            "title":"See Hunts"
                        }]
                    },
                    {
                        "title": "Games",
                        "buttons":[{
                            "type":"postback",
                            "payload": "getPosts_games",
                            "title":"See Hunts"
                        }]
                    },
                    {
                        "title": "Podcasts",
                        "buttons":[{
                            "type":"postback",
                            "payload": "getPosts_podcasts",
                            "title":"See Hunts"
                        }]
                    },
                    {
                        "title": "Books",
                        "buttons":[{
                            "type":"postback",
                            "payload": "getPosts_books",
                            "title":"See Hunts"
                        }]
                    }
                    

                ]
              }
            }
        })

    })

}







/* *****************************

    POSTS

***************************** */


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
            "title":"Discuss/Upvote"
          }         
        ]
    }
    
    return postAttachment;

}



function getHunts(bot, message, url) {

    bot.reply(message, "Fetching hunts...");

    httpGet(url, function(response) {

        var hunts = response.posts;

        console.log(hunts);

        var elements = [];

        for ( var i = 0; i < 9; i++ ) {

            if ( hunts[i] ) {
                var post = setupPostAttachment( hunts[i] );
                elements.push(post);
            } else {
                break;
            }
            
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





/* *****************************

    Single Post Information

***************************** */


var sendPostInfo_intro = function(bot, message, post, callback) {

    var reply = 'Some more information about "'+post.name+'"';

    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        callback(true)
    })
}


var sendPostInfo_votes = function(bot, message, post, callback) {

    var reply = "It has "+post.votes_count+" votes";

    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        callback(true)
    })
}


var sendPostInfo_makerInfo = function(bot, message, post, callback) {
    var number_of_makers = post.makers.length;
    var actual_number_of_makers = number_of_makers + 1;
    bot.reply(message, "There are "+ actual_number_of_makers +" makers identified");

    var makersProfiles = [];

    for ( var i = 0; i < number_of_makers; i++ ) {
        var maker = post.makers[i];
        var makerAttachment = {
            "title": maker.name,
            "image_url": maker.image_url.original ? maker.image_url.original : "",
            "subtitle": maker.headline ? maker.headline : "",
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

    var reply = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: makersProfiles

          }
        }
    }

    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        callback(true)
    });
}


var sendPostInfo_makerMessage = function(bot, message, post, callback) {

    var number_of_comments = post.comments.length;

    if ( number_of_comments > 0 ) {

        var makerMessage = false;

        for ( var i = 0; i < number_of_comments; i++ ) {
            if ( post.comments[i].maker == true ) {
                makerMessage = post.comments[i].body;
            }
            if ( makerMessage ) { break; }
        }

        if ( makerMessage ) {
            var reply = 'From a maker — "' + makerMessage + '"';
            bot.reply(message, reply, function(err, response) {
                if (err) console.log(err)
                callback(true)
            });

        } else { callback(true) }
    } else { callback(true) }
}


var sendPostInfo_media = function(bot, message, post, callback) {
   var number_of_media = post.media.length;
    if ( number_of_media > 0 ) {

        bot.reply(message, "Here are some related images...", function(err, response) {

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

            var reply = {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    elements: mediaAttachments
                }
            }
            bot.reply(message, reply, function(err, response) {
                if (err) console.log(err)
                callback(true)
            });

        });

    } else { callback(true) }
}




function getPostInfo(bot, message, postID) {

    var url = "https://api.producthunt.com/v1/posts/"+postID+PH_access_token;

    httpGet(url, function(response) {

        var post = response.post;

        // Introduction
        sendPostInfo_intro(bot, message, post, function(response) {

            // Number of Votes
            sendPostInfo_votes(bot, message, post, function(response) {

                // Maker
                if ( post.makers.length > 0 ) {

                    // Maker - Information
                    sendPostInfo_makerInfo(bot, message, post, function(response) {
                        
                        // Maker - Message
                        sendPostInfo_makerMessage(bot, message, post, function(response) {

                            // Media
                            sendPostInfo_media(bot, message, post, function(response) {})

                        })
                    })

                } else {

                    bot.reply(message, "No makers have been identified yet", function(err, response) {
                        if (err) console.log(err)

                        // Media
                        sendPostInfo_media(bot, message, post, function(response) {})
                    });
                }

            })
        }) // END!

    }) // End http get
}






/* *****************************

    CONTROLLER

***************************** */



/****  KEYWORDS ************************/

controller.hears(['hello', 'hi'], 'message_received', function (bot, message) {

    bot.reply(message, "Hi there!");
    chooseCategoryPrompt(bot, message);
    
})

controller.hears(['help'], 'message_received', function (bot, message) {
    var reply = "Looks like you need help";
    bot.reply(message, reply);
})



controller.hears(['tech', 'technology'], 'message_received', function (bot, message) {
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/tech/posts"+PH_access_token)
})
controller.hears(['games', 'game'], 'message_received', function (bot, message) {
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/games/posts"+PH_access_token)
})
controller.hears(['podcasts', 'podcast'], 'message_received', function (bot, message) {
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/podcasts/posts"+PH_access_token)
})
controller.hears(['books', 'book'], 'message_received', function (bot, message) {
    getHunts(bot, message, "https://api.producthunt.com/v1/categories/books/posts"+PH_access_token)
})




/****  FACEBOOK POSTBACKS  ************************/

controller.on('facebook_postback', function (bot, message) {

    if ( message.payload.indexOf('postInfo_') > -1 ) {
        var postID = message.payload.split("_")[1];
        getPostInfo(bot, message, postID);
    }

    else if ( message.payload.indexOf('getPosts_') > -1 ) {
        var postCategory = message.payload.split("_")[1];
        getHunts(bot, message, "https://api.producthunt.com/v1/categories/"+postCategory+"/posts"+PH_access_token)
    }
 

})


/****  OTHER EVENTS  ************************/

controller.on('facebook_optin', function (bot, message) {
    bot.reply(message, "Welcome!");

})


controller.on('message_received', function (bot, message) {
    bot.reply(message, "Sorry, I didn't get that");

})


