var Botkit = require('botkit')
var https = require("https")

var accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
var verifyToken = process.env.FACEBOOK_VERIFY_TOKEN
var port = process.env.PORT || 3000
var PH_access_token = process.env.PH_ACCESS_TOKEN || "f9985dd2199d08509371703c57faf5bc8d050e39f9ba0926bb13f9c15b55a254";
PH_access_token = "?access_token=" + PH_access_token

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
                        "buttons":[
                            {
                                "type":"postback",
                                "payload": "getPosts_tech",
                                "title":"Today's Hunts"
                            },
                            {
                                "type":"postback",
                                "payload": "getPosts_tech_1",
                                "title":"Yesterday's Hunts"
                            }
                        ]
                    },
                    {
                        "title": "Games",
                        "buttons":[
                            {
                                "type":"postback",
                                "payload": "getPosts_games",
                                "title":"Today's Hunts"
                            },
                            {
                                "type":"postback",
                                "payload": "getPosts_games_1",
                                "title":"Yesterday's Hunts"
                            }
                        ]
                    },
                    {
                        "title": "Podcasts",
                        "buttons":[
                            {
                                "type":"postback",
                                "payload": "getPosts_podcasts",
                                "title":"Today's Hunts"
                            },
                            {
                                "type":"postback",
                                "payload": "getPosts_podcasts_1",
                                "title":"Yesterday's Hunts"
                            }
                        ]
                    },
                    {
                        "title": "Books",
                        "buttons":[
                            {
                                "type":"postback",
                                "payload": "getPosts_books",
                                "title":"Today's Hunts"
                            },
                            {
                                "type":"postback",
                                "payload": "getPosts_books_1",
                                "title":"Yesterday's Hunts"
                            }
                        ]
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

    var category = url.split("/categories/");
        category = category[1].split("/posts")[0];

    bot.reply(message, "Fetching hunts in the " +category+ " category...");

    httpGet(url, function(response) {

        var hunts = response.posts;

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

    var reaction = "! 🙃";

    var reply = "It has "+post.votes_count+" votes" + reaction;

    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        callback(true)
    })
}


var sendPostInfo_makerInfo = function(bot, message, post, callback) {
    var number_of_makers = post.makers.length;

    var replyNOM = "There was 1 maker identified, here's some more information on them"
    if ( number_of_makers > 1 ) {
        replyNOM = "There were "+ number_of_makers +" makers identified. Here's some more information on them"
    }

    bot.reply(message, replyNOM);

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
                makerMessage = post.comments[i];
            }
            if ( makerMessage ) { break; }
        }

        if ( makerMessage ) {

            var messageFrom = makerMessage.user.name;
            var messageBody = makerMessage.body;

            var reply = 'From '+ messageFrom +' — "' + messageBody + '"';

            reply = reply.slice(0, 310) + "...";


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


        var mediaAttachments = [];

        for ( var i = 0; i < number_of_media; i++ ) {
            var mediaItem = post.media[i];
            if ( mediaItem.media_type == "image" ) {
                mediaAttachments.push({
                    "title": "Media",
                    "image_url": mediaItem.image_url
                })
            }
        }

        if ( mediaAttachments.length > 1 ) {

            console.log(mediaAttachments);

            bot.reply(message, "Here are some related images...", function(err, response) {

                var reply = {
                    attachment: {
                      type: 'template',
                      payload: {
                        template_type: 'generic',
                        elements: mediaAttachments
                      }
                    }
                }
                bot.reply(message, reply, function(err, response) {
                    if (err) console.log(err)
                    callback(true)
                });
            })

        } else { callback(true) }
    } else { callback(true) }
}




var sendPostInfo_CTA = function(bot, message, post) {

    console.log("cta buttons called")

    bot.reply(message, {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'button',
                buttons: [
                    {
                        "type":"web_url",
                        "url": post.redirect_url,
                        "title":"Hunt This"
                    },
                    {
                        "type":"web_url",
                        "url": post.discussion_url,
                        "title":"Discuss/Upvote"
                    }  
                ]
            }
        }
    })
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
                            sendPostInfo_media(bot, message, post, function(response) {

                                sendPostInfo_CTA(bot, message, post);

                            })

                        })
                    })

                } else {

                    bot.reply(message, "Looks like none of the makers have been identified yet", function(err, response) {
                        if (err) console.log(err)

                        // Media
                        sendPostInfo_media(bot, message, post, function(response) {

                            sendPostInfo_CTA(bot, message, post);

                        })
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
    var reply = "Hi there! I have some hunts for you";
    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        chooseCategoryPrompt(bot, message);
    });
})

controller.hears(['help'], 'message_received', function (bot, message) {
    var reply = "Looks like you need help";
    bot.reply(message, reply);

    // Report error, say hello
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

        var days_ago = message.payload.split("_")[2];
        var days_ago_parameter = "";

        if ( days_ago ) { days_ago_parameter = "&days_ago="+days_ago; }

        getHunts(bot, message, "https://api.producthunt.com/v1/categories/"+postCategory+"/posts"+PH_access_token+days_ago_parameter)
    }
 

})


/****  OTHER EVENTS  ************************/

controller.on('facebook_optin', function (bot, message) {
    var reply = "Welcome! I have some hunts for you";
    bot.reply(message, reply, function(err, response) {
        if (err) console.log(err)
        chooseCategoryPrompt(bot, message);
    });

})


controller.on('message_received', function (bot, message) {
    bot.reply(message, "Sorry, I didn't get that. Say help if you need some help");

})


