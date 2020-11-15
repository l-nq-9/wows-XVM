///// おのおの指定してくれや /////
var apikey = "";
var apiurl = "https://api.worldofwarships.asia";
var wowspath = "C:/Games/World_of_Warships_Asia";
////////////////////////////////




var express = require("express");
var fs = require("fs");
var request = require('request');

var app = express();

// static endpoint
app.use(express.static(__dirname + '/static'));

var port = 10080;
var server = app.listen(port, function(){
    console.log("XVM is listening to PORT:" + server.address().port);
});

function fixing00(num){
    return Math.round(num * 100) / 100;
}

function fixing0(num){
    return Math.round(num * 10) / 10;
}

function fixing(num){
    return Math.round(num);
}

app.get("/api/player", function(req, res, next){
    var name = req.query.name;
    // console.log(name);

    var options_getid = {
        url: apiurl + "/wows/account/list/?application_id=" + apikey + "&search=" + name,
        method: 'get',
        json: true,
    }

    var player = {};

    request(options_getid, function(err, response, body){

        var pid = null;
        
        if (body.status == 'error'){
            player.status = 'error';
            player.name = body.error.value;
            console.log(body.error.value);
            res.json(player);
            return;
        }

        for (var i = 0; i<body.meta.count; i++){
            if (body.data[i].nickname == name){
                player.name = body.data[i].nickname;
                
                player.id = body.data[i].account_id;
                pid = body.data[i].account_id.toString();
            }
        }

        if (player.id != 0){

            var options_getstats = {
                url: apiurl + "/wows/account/info/?application_id=" + apikey + "&account_id=" + pid + "&extra=statistics.pvp_div3%2C+statistics.pvp_solo",
                method: "get",
                json: true,
            }

            var options_getclan = {
                url: apiurl + "/wows/clans/accountinfo/?application_id=" + apikey + "&account_id=" + pid + "&extra=clan",
                method: "get",
                json: true,
            }

            request(options_getstats, function(statserr, statsresponse, statsbody){

                // console.log(statsbody);

                if (statsbody.status != "error"){
                    var stats = statsbody.data[pid];

                    if (stats.statistics != null){
                        player.hidden = "no";
                        player.battles = stats.statistics.pvp.battles;
                        player.totalwr = fixing00((stats.statistics.pvp.wins / stats.statistics.pvp.battles) * 100);
                        player.solowr = fixing00((stats.statistics.pvp_solo.wins / stats.statistics.pvp_solo.battles) * 100);
                        player.div3wr = fixing00((stats.statistics.pvp_div3.wins / stats.statistics.pvp_div3.battles) * 100);
                        player.soloratio = fixing0((stats.statistics.pvp_solo.battles / stats.statistics.pvp.battles) * 100);
                        player.avgdmg = fixing(stats.statistics.pvp.damage_dealt / stats.statistics.pvp.battles);
                        player.avgkill = fixing00(stats.statistics.pvp.frags / stats.statistics.pvp.battles);
                        player.survive = fixing0((stats.statistics.pvp.survived_battles / stats.statistics.pvp.battles) * 100);
                        player.killdeath = fixing00(stats.statistics.pvp.frags / (stats.statistics.pvp.battles - stats.statistics.pvp.survived_battles));    
                    }else{
                        player.hidden = "yes";
                    }
                     
                    request(options_getclan, function(clanerr, clanres, clanbody){
                        
                        player.clantag = null;
                        if (clanbody.data[pid] != null){
                            if (clanbody.data[pid].clan_id != null){
                                player.clantag = clanbody.data[pid].clan.tag;
                            }
                        }                    
    
                        player.status = 'ok';
                        res.json(player);
                    });
                }    
            });
      
        } //if (player.id != 0){

    });

});

app.get("/api/arena", function(req, res, next){
    // var jsonfile = "sampleData/randomSample.json";
    // var jsonfile = "sampleData/coopSample.json";
    // var jsonfile = "sampleData/senarioSample.json";
    var jsonfile = wowspath + "/replays/tempArenaInfo.json";
    // console.log(jsonfile);

    var arenajson = {};
    try {
        arenajson = JSON.parse(fs.readFileSync(jsonfile, 'utf8'));
    }catch{
        arenajson.matchGroup = "notInBattle";
    }
    res.json(arenajson);
    // console.log(arenajson);
});

app.get("/api/ships", function(req, res, next){
    var playerid = req.query.playerid;
    var shipid = req.query.shipid;

    console.log("playerId:" + playerid);
    console.log("shipId:" + shipid);
    console.log();

    // var playerid = "2013880375"; //l_nq__9
    // var shipid = "4181669712"; //Richelieu

    var options = {
        url: apiurl + "/wows/ships/stats/?application_id=" + apikey + "&account_id=" + playerid + "&ship_id=" + shipid,
        method: "get",
        json: true,
    }

    var ships = {};

    request(options, function(err, response, body){

        // console.log(body);

        if (body.data[playerid] != null){
            var stats = body.data[playerid][0].pvp;

            if (stats.battles > 0){
                ships.shipid = Number(shipid);
                ships.battles = stats.battles;
                ships.wr = fixing00( (stats.wins / stats.battles) * 100 );
                ships.avgdmg = fixing( stats.damage_dealt / stats.battles );
                ships.avgkill = fixing00( stats.frags / stats.battles );
                ships.killdeath = fixing00( stats.frags / (stats.battles - stats.survived_battles) );
        
                if (stats.main_battery.shots > 0){
                    ships.gunaim = fixing0( (stats.main_battery.hits / stats.main_battery.shots) * 100 );
                }else{
                    ships.gunaim = null;
                }
        
                if (stats.torpedoes.shots > 0){
                    ships.torpaim = fixing0( (stats.torpedoes.hits / stats.torpedoes.shots) * 100 );
                }else{
                    ships.torpaim = null;
                }
                   
                ships.survive = fixing0( (stats.survived_battles / stats.battles) * 100 );
                ships.avgdown = fixing0( stats.planes_killed / stats.battles );    
            }
        }

        var options_base = {
            url: apiurl + "/wows/encyclopedia/ships/?application_id=" + apikey + "&ship_id=" + shipid + "&language=en",
            method: "get",
            json: true,
        }

        request(options_base, function(error, responsebase, base_body){

            ships.name = base_body.data[shipid].name;
            ships.tier = base_body.data[shipid].tier;
            ships.nation = base_body.data[shipid].nation;
            ships.type = base_body.data[shipid].type;

            res.json(ships);

        });
       
        
    });
});

// var apikey = "";
// var apiurl = "https://api.worldofwarships.asia";
// var wowspath = "C:/Games/World_of_Warships_Asia";