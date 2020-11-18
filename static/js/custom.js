new Vue({
    el: "#test",
    data: {
        polling: 4000,　//ポーリング間隔（ﾐﾘ秒） CPUの負荷とか考えるならおのおの調整してくれや
        inBattle: false,
        all: [],
        allies: [],
        enemies: [],
        jsonTime: "0000",
        rekisi: 10000, //初期値は10000. このあと正確な値を取得
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
                                    var allLineup = [];

                                    for (var i = 0; i<Object.keys(res.data.vehicles).length; i++){
                                        if (res.data.vehicles[i].id > 0){
                                            allLineup.push(res.data.vehicles[i]);
                                        }                         
                                    }
                                    self.sortLineup(allLineup);

                                    console.log(allLineup);
                                    self.getXVM(allLineup);
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
        getXVM(list){
            var self = this;

            self.allies = [];
            self.enemies = [];

            for (var i = 0; i<list.length; i++){
                self.getStats(list[i]);
            }

            Promise.all(list)
                .then( function(result){
                    console.log(result);
                });

            self.get1rekisi();
        },
        getStats(arenaData){
            var self = this;

            return new Promise( function(resolve, reject){
                var playerData = self.getPlayer(arenaData.name);

                playerData.then( function(playerResult){
                    var playerid = playerResult.id.toString();
                    var shipid = arenaData.shipId;

                    var shipData = self.getPlayerShip(playerid, shipid);

                    shipData.then( function(shipResult){
                        var temp = [playerResult, shipResult];

                        var relation = arenaData.relation;
                        if (relation == 0 || relation == 1){
                            self.allies.push(temp);                   
                        }else{
                            self.enemies.push(temp);
                        }
                        console.log(temp);
                        resolve("done");
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
        sortLineup(list){
            list.sort( function(val1, val2){
                var a = ((val1.shipId % 1048576)-(val1.shipId / 1048576));
                var b = ((val2.shipId % 1048576)-(val2.shipId / 1048576));
                if( a < b ) {
                    return 1;
                } else {
                    return -1;
                }
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
            }else if (value <= 33.33){
                return "bold under";
            }else{
                return;
            }
        },
        get1rekisi(){
            var self = this;
            var rekisiData = self.getPlayer("rekisi");
            rekisiData.then( function(rekisiResult){
                self.rekisi = rekisiResult.battles;
            });
        },
        compareRekisi: function(battles){
            if (battles >= this.rekisi){
                return "bold under";
            }else{
                return;
            }
        },
        checkShirogane: function(aim, shipClass){
            if (shipClass == "Battleship" && aim >= 32){
                return "bold under";
            }else if (shipClass == "Cruiser" && aim >= 40){
                return "bold under";
            }else if (shipClass == "Destroyer" && aim >= 50){
                return "bold under";
            }else{
                return;
            }
        },
        checkBot: function(ratio, battles){
            if (battles >= 10 && ratio <= 16.66){
                return "bold under";
            }else{
                return;
            }
        },
        showBattleStatus: function(){
            if (this.inBattle){
                return "In Battle!"
            }else{
                return "Not in Battle"
            }
        }
    },
});