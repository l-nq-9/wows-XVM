require('dotenv').config();
var apikey = process.env.APIKEY;
var apiurl = process.env.APIURL;
var wowspath = process.env.WOWSPATH;

var express = require("express");
var bodyParser = require('body-parser');

var fs = require("fs");
var request = require('request');

var app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// static endpoint
app.use(express.static(__dirname + '/static'));

var port = 10180;
var total_pages = 6;
var server = app.listen(
    port, async function(){
        console.log(
            "XVM is listening to PORT:" + server.address().port
        );
        for (let page = 1; page<=total_pages; page++){
            console.log("A" + page);
            await getShipWikiJson(page);
            console.log("B" + page);
        }
        console.log("C");
    }
);

async function getShipWikiJson(page){ // store shipWikiJson1-n
    request.get(
        {
            uri: apiurl + "/wows/encyclopedia/ships/?application_id=" + apikey + "&page_no=" + page + "&fields=name%2C+tier%2C+nation%2C+type%2C+is_premium%2C+is_special%2C+default_profile.concealment.detect_distance_by_ship%2C+mod_slots&language=en",
            json: true
        }, function(err, req, data){
            fs.writeFile('data/shipwiki_'+ page +'.json', JSON.stringify(data), function writeJson(error){
                if (error) return console.log(error);
                console.log("AA" + page);
                return true;
            });
        }        
    );
}


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

    var options_getid = {
        url: apiurl + "/wows/account/list/?application_id=" + apikey + "&search=" + name,
        method: 'get',
        json: true,
    }

    var player = {};

    request(options_getid, function(err, response, body){

        var pid = null;
        
        if (err){
            player.id = null;
            res.json(player);
            return;
        }
        if (body.status == 'error'){
            player.status = 'error';
            player.name = body.error.value;
            console.log("body.error.value" + body.error.value);
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

                if (statserr){
                    res.end();
                    return;
                }

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

                        if (clanerr){
                            res.end();
                            return;
                        }
                        
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
      
        }
    });
});

app.get("/api/arena", function(req, res, next){
    // let jsonfile = "sampleData/randomSample.json";
    // let jsonfile = "sampleData/coopSample.json";
    // let jsonfile = "sampleData/newCoop.json";
    // let jsonfile = "sampleData/senarioSample.json";
    // let jsonfile = "sampleData/ErrortempArenaInfo.json";
    // let jsonfile = wowspath + "/replays/tempArenaInfo.json";
    let jsonfile = "sampleData/sensuikan.json";

    let arenajson = {};
    try {
        arenajson = JSON.parse(fs.readFileSync(jsonfile, 'utf8'));
    }catch{
        arenajson.matchGroup = "notInBattle";
    }
    res.json(arenajson);
});

app.get("/api/ships", function(req, res, next){
    let playerid = req.query.playerid;
    let shipid = req.query.shipid;

    console.log("playerId in /api/ships : " + playerid);
    console.log("shipId in /api/ships : " + shipid);
    console.log();

    // let playerid = "2013880375"; //l_nq__9
    // let shipid = "4181669712"; //Richelieu

    var options = {
        url: apiurl + "/wows/ships/stats/?application_id=" + apikey + "&account_id=" + playerid + "&ship_id=" + shipid,
        method: "get",
        json: true,
    }

    var ships = {};

    request(options, function(err, response, body){

        if (err){
            res.end();
            return;
        }

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

        res.json(ships);
        
    });
});

app.get("/api/shipWiki", function(req, res, next){
    var shipid = req.query.shipid;

    var ships = {};

    var wikifile = "data/shipwiki.json";

    var shipwiki = {};
    try{
        shipwiki = JSON.parse(fs.readFileSync(wikifile, 'utf8'));
    }catch{

    }

    ships.name = shipwiki.data[shipid].name;
    ships.tier = shipwiki.data[shipid].tier;
    ships.nation = shipwiki.data[shipid].nation;
    ships.type = shipwiki.data[shipid].type;
    let default_conceal = shipwiki.data[shipid].default_profile.concealment.detect_distance_by_ship
    let full_conceal = default_conceal - default_conceal*0.1 - default_conceal*0.03;
    if (shipwiki.data[shipid].mod_slots >= 5){
        full_conceal = full_conceal - default_conceal*0.1;
    }
    ships.fullconceal = fixing0(full_conceal);
    ships.shipId = shipid;

    res.json(ships);

});

app.get("/api/rekisi", function(req, res, next){
    var options_getRekisi = {
        url: apiurl + "/wows/account/info/?application_id=" + apikey + "&account_id=2004758555",
        method: "get",
        json: true,
    }

    var rekisi = {};

    request(options_getRekisi, function(err, response, body){
        if (err != null){
            var rekisiFile = "data/rekisi.json";
            var rekisiJson = JSON.parse(fs.readFileSync(rekisiFile, 'utf8'));
            res.json(rekisiJson);
        }

        rekisi.battles = body.data[2004758555].statistics.pvp.battles;
        res.json(rekisi);
    });

});

app.put("/api/rekisi", function(req, res, next){
    var settingFile = "data/rekisi.json";
    var settingJson = JSON.parse(fs.readFileSync(settingFile, 'utf8'));

    settingJson.rekisi = req.body.rekisi;

    fs.writeFile(settingFile, JSON.stringify(settingJson, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
    });

    res.end();
});

app.get("/api/settings", function(req, res, next){
    var settingFile = "data/settings.json";

    var settingJson = {};
    try{
        settingJson = JSON.parse(fs.readFileSync(settingFile, 'utf8'));
    }catch{

    }
    res.json(settingJson);
});

app.put("/api/settings", function(req, res, next){

    var settingFile = "data/settings.json";

    var settingJson = JSON.parse(fs.readFileSync(settingFile, 'utf8'));

    settingJson.shipWr = req.body.shipWr;
    settingJson.shipBattles = req.body.shipBattles;
    settingJson.shipDmg = req.body.shipDmg;
    settingJson.shipKill = req.body.shipKill;
    settingJson.shipSurvive = req.body.shipSurvive;
    settingJson.shipKd = req.body.shipKd;
    settingJson.shipGun = req.body.shipGun;
    settingJson.shipTorp = req.body.shipTorp;
    settingJson.shipAa = req.body.shipAa;
    settingJson.ttlBattles = req.body.ttlBattles;
    settingJson.ttlDmg = req.body.ttlDmg;
    settingJson.ttlKill = req.body.ttlKill;
    settingJson.ttlKd = req.body.ttlKd;
    settingJson.soloWr = req.body.soloWr;
    settingJson.soloRatio = req.body.soloRatio;
    settingJson.divWr = req.body.divWr;
    settingJson.shipNation = req.body.shipNation;
    settingJson.darkTheme = req.body.darkTheme;

    fs.writeFile(settingFile, JSON.stringify(settingJson, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
    });

    res.end();
});