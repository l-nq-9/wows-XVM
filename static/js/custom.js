new Vue({
    el: "#test",
    data: {
        polling: 2000,　//ポーリング間隔（ﾐﾘ秒） CPUの負荷とか考えるならおのおの調整してくれや
        displayInterval: 125, //列の表示間隔（ﾐﾘ秒）
        inBattle: false,
        allies: [],
        dispAllies: [],
        enemies: [],
        dispEnemies: [],
        jsonTime: "0000",
        rekisi: 10000, //10000で仮置きしているだけ. このあと正確な値を取得
        tableWidth: 1200,
        darkTheme: false,

        settings: [
            true, //0 shipWr
            true, //1 shipBattles
            true, //2 shipDmg
            true, //3 shipKill
            true, //4 shipSurvive
            true, //5 shipKd
            true, //6 shipGun
            true, //7 shipTorp
            true, //8 shipAa
            true, //9 ttlBattles
            true, //10ttlDmg
            true, //11ttlKill
            true, //12ttlKd
            true, //13soloWr
            true, //14soloRatio
            true, //15divWr
        ]
    },
    mounted: function(){
        var self = this;

        axios
            .get("http://localhost:10080/api/settings")
            .then( function(res){

                self.settings.splice(0, 1, res.data.shipWr);
                self.settings.splice(1, 1, res.data.shipBattles);
                self.settings.splice(2, 1, res.data.shipDmg);
                self.settings.splice(3, 1, res.data.shipKill);
                self.settings.splice(4, 1, res.data.shipSurvive);
                self.settings.splice(5, 1, res.data.shipKd);
                self.settings.splice(6, 1, res.data.shipGun);
                self.settings.splice(7, 1, res.data.shipTorp);
                self.settings.splice(8, 1, res.data.shipAa);
                self.settings.splice(9, 1, res.data.ttlBattles);
                self.settings.splice(10, 1, res.data.ttlDmg);
                self.settings.splice(11, 1, res.data.ttlKill);
                self.settings.splice(12, 1, res.data.ttlKd);
                self.settings.splice(13, 1, res.data.soloWr);
                self.settings.splice(14, 1, res.data.soloRatio);
                self.settings.splice(15, 1, res.data.divWr);
                self.settings.splice(16, 1, res.data.darkTheme);
                self.darkTheme = res.data.darkTheme;
            });

        self.get1rekisi();
    },
    computed:{
        controller(){
            setInterval(
                function(){
                    var self = this;
                    
                    axios
                        .get("http://localhost:10080/api/arena")
                        .then(function (res){
                            if (res.data.matchGroup != "notInBattle"){
                                self.inBattle = true;

                                if (res.data.dateTime != self.jsonTime){
                                    self.jsonTime = res.data.dateTime;

                                    self.allies = [];
                                    self.enemies = []; //現在の表をリセット

                                    var listGetStats = [];

                                    for (var i = 0; i<Object.keys(res.data.vehicles).length; i++){
                                        if (res.data.vehicles[i].id > 0){
                                            listGetStats.push(self.getStats(res.data.vehicles[i]));
                                        }
                                        
                                    }
                                    Promise.all(listGetStats)
                                        .then( function(){
                                            self.sortLineup(self.allies);
                                            self.sortLineup(self.enemies);

                                            // self.dispAllies = self.allies;
                                            // self.dispEnemies = self.enemies;

                                            var timer;

                                            var alliesLength = self.allies.length;
                                            var enemiesLength = self.enemies.length;

                                            var alliesCount = 0;
                                            var enemiesCount = 0;

                                            timer = setInterval( function(){

                                                if (alliesCount < alliesLength){
                                                    self.dispAllies.push(self.allies[alliesCount]);
                                                    alliesCount++;
                                                }
                                                
                                                if (enemiesCount < enemiesLength){
                                                    self.dispEnemies.push(self.enemies[enemiesCount]);
                                                    enemiesCount++;
                                                }  
                                                
                                                if (alliesCount == alliesLength && enemiesCount == enemiesLength){
                                                    clearInterval(timer);
                                                }
                                            }, self.displayInterval)
                                        });
                                }

                            }else{
                                self.inBattle = false;
                            }
                        })
                }.bind(this)
            , this.polling)
        },
        
    },
    methods: {
        getStats(arenaData){
            var self = this;

            return new Promise( function(resolve, reject){
                var oneColumn = [];

                var shipWiki = self.getShipWiki(arenaData.shipId);
                shipWiki.then( function(wikiResult){
                    oneColumn.push(wikiResult);

                    console.log(wikiResult);

                    if (wikiResult.name == null){
                        console.log("ahi");
                        resolve();
                        return;
                    }

                    var player = self.getPlayer(arenaData.name);
                    player.then( function(playerResult){
                        oneColumn.push(playerResult);

                        if (playerResult.id != null){
                            var playerid = playerResult.id.toString();
                        }else{
                            resolve();
                            return;
                        }
                        
                        var ship = self.getPlayerShip(playerid, arenaData.shipId);
                        ship.then( function(shipResult){
                            oneColumn.push(shipResult);

                            if (arenaData.relation == 0 || arenaData.relation == 1){
                                self.allies.push(oneColumn);
                            }else{
                                self.enemies.push(oneColumn);
                            }
                            resolve();
                        })
                    })

                })             
            })
        },
        getPlayer(name){
            // var self = this;
            return new Promise( function(resolve, reject){
                axios
                    .get("http://localhost:10080/api/player", {
                        params: {
                            name: name
                        }
                    })
                    .then( function(res){
                        resolve(res.data);
                    })
                    .catch( function(err){
                        console.log("in getPlayer()" + err);
                        reject();
                    })
            });
        },
        getPlayerShip(playerid, shipid){
            return new Promise( function(resolve, reject){
                axios
                    .get("http://localhost:10080/api/ships", {
                        params: {
                            playerid: playerid,
                            shipid: shipid
                        }
                    })
                    .then( function(res){
                        resolve(res.data);
                    })
                    .catch( function(err){
                        console.log("in getPlayerShip()" + err);
                    })
            });
        },
        getShipWiki(shipid){
            return new Promise( function(resolve, reject){
                axios
                    .get("http://localhost:10080/api/shipWiki", {
                        params: {
                            shipid: shipid
                        }
                    })
                    .then( function(res){
                        resolve(res.data);
                    })
                    .catch( function(err){
                        console.log("in getShipWiki()" + err);
                    })
            })
        },
        sortLineup(list){
            var self = this;

            list.sort( function(val1, val2){

                // ship type
                var type1 = self.getClassNumber(val1[0].type);
                var type2 = self.getClassNumber(val2[0].type);
                if( type1 < type2 ) return 1;
                if( type1 > type2 ) return -1;

                // tier高い順
                var tier1 = val1[0].tier;
                var tier2 = val2[0].tier;
                if( tier1 < tier2 ) return 1;
                if( tier1 > tier2 ) return -1;

                // nation
                var nation1 = self.getNationKey(val1[0].nation);
                var nation2 = self.getNationKey(val2[0].nation);
                if( nation1 > nation2 ) return 1;
                if( nation1 < nation2 ) return -1;

                // shipId大きい順
                if( val1[0].shipId < val2[0].shipId ) return 1;
                if( val1[0].shipId > val2[0].shipId ) return -1;
                
                // clan+nameアルファベット順？
                var name1;
                var name2;
                if (val1[1].clantag != null){
                    name1 = val1[1].clantag + val1[1].name;
                }else{
                    name1 = val1[1].name;
                }

                if (val2[1].clantag != null){
                    name2 = val2[1].clantag + val2[1].name;
                }else{
                    name2 = val2[1].name;
                }

                if( name1 > name2 ) return 1;
                if( name1 < name2 ) return -1;

                return 0;
            });
        },
        getColorWR: function(value){
            if (value != null){
                if	(value < 47) {
                    return 'class1';
                }else if(value < 49) {
                    return 'class2';
                }else if(value < 52) {
                    return 'class3';
                }else if(value < 57) {
                    return 'class4';
                }else if(value < 65) {
                    return 'class5';
                }else if(value < 101) {
                    return 'class6';
                }
            }else{
                return 'hiddenAccount';
            }
        },
        getClassKanji: function(value){
            if (value == "Battleship"){
                return "戦";
            }else if (value == "Cruiser"){
                return "巡";
            }else if (value == "Destroyer"){
                return "駆";
            }else if (value == "AirCarrier"){
                return "空";
            }else if (value == "Submarine"){
                return "潜";
            }
        },
        getClassNumber(value){
            var types = [
                ["Battleship", 8], ["Cruiser", 6], ["Destroyer", 4], ["AirCarrier", 10], ["Submarine", 2]
            ]

            for (var i = 0; i<types.length; i++){
                if (value == types[i][0]){
                    return types[i][1];
                }
            }
        },
        getNationKey(value){
            var nations = [
                ["japan", "J"], ["usa", "A"], ["ussr", "R"], ["germany", "G"],
                ["uk", "B"], ["france", "F"], ["europe", "W"], ["pan_asia", "Z"],
                ["italy", "I"], ["pan_america", "V"], ["commonwealth", "U"]
            ];
            
            for (var i=0; i<nations.length ; i++) {
                if (value == nations[i][0]) {
                    return nations[i][1];
                }
            }
        },
        tellHidden: function(wr, flag){
            if (flag != "yes"){
                return wr;
            }else{
                return "Hidden";
            }
        },
        inSoloRatio: function(value){
            if (value == 100){
                return "bold";
            }else if (value <= 30){
                return "bold under";
            }else{
                return;
            }
        },
        get1rekisi(){
            var self = this;

            axios
                .get("http://localhost:10080/api/rekisi")
                .then( function(res){
                    self.rekisi = res.data.battles;
                    self.save1rekisi();
                })

        },
        compareRekisi: function(battles){
            if (battles >= this.rekisi){
                return "bold under";
            }else{
                return;
            }
        },
        checkShirogane: function(aim, shipClass){
            if (shipClass == "Battleship" && aim >= 32.5){
                return "bold under";
            }else if (shipClass == "Cruiser" && aim >= 40){
                return "bold under";
            }else if (shipClass == "Destroyer" && aim >= 51){
                return "bold under";
            }else{
                return;
            }
        },
        checkBot: function(ratio, battles){
            if (battles >= 16 && ratio <= 12.5){
                return "bold under";
            }else{
                return;
            }
        },
        showBattleStatus: function(){
            if (this.inBattle){
                return "In Battle!";
            }else{
                return "Not in Battle";
            }
        },
        settingButton(index){
            this.settings.splice(index, 1, !this.settings[index]);
        },
        decideTableWidth(){
            var counter = 0;

            for (var i = 0; i<=15; i++){
                if (this.settings[i]){
                    counter++;
                }
            }

            this.tableWidth = 460 + 52*counter;
        },
        saveSettings(){
            var self = this;
            
            axios
                .put("http://localhost:10080/api/settings", {
                    shipWr: self.settings[0],
                    shipBattles: self.settings[1],
                    shipDmg: self.settings[2],
                    shipKill: self.settings[3],
                    shipSurvive: self.settings[4],
                    shipKd: self.settings[5],
                    shipGun: self.settings[6],
                    shipTorp: self.settings[7],
                    shipAa: self.settings[8],
                    ttlBattles: self.settings[9],
                    ttlDmg: self.settings[10],
                    ttlKill: self.settings[11],
                    ttlKd: self.settings[12],
                    soloWr: self.settings[13],
                    soloRatio: self.settings[14],
                    divWr: self.settings[15],
                    darkTheme: self.darkTheme
                })
                .then( function(){
                    console.log("Settings saved")
                })
        },
        save1rekisi(){
            var self = this;
            axios
                .put("http://localhost:10080/api/rekisi", {
                    rekisi: self.rekisi
                })
                .then( function(){
                    console.log("1rekisi saved");
                })
        },
        changeThemeToLight(){
            this.darkTheme = false;
        },
        changeThemeToDark(){
            this.darkTheme = true;
        }
    },
});


//時代の敗北者jQuery
$(".settings").click(function(){
    $("body").animate({left : "-700px"});
    $("#modalScreen").fadeIn(500);
});

$("#modalScreen").click(function(){
    $("body").animate({left: "0px"});
    $("#modalScreen").fadeOut(500);
});