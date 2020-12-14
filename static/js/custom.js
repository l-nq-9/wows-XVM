new Vue({
    el: "#test",
    data: {
        polling: 2000,　//ポーリング間隔（ﾐﾘ秒） CPUの負荷とか考えるならおのおの調整してくれや
        inBattle: false,
        all: [],
        allies: [],
        enemies: [],
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
                                    var allLineup = [];

                                    for (var i = 0; i<Object.keys(res.data.vehicles).length; i++){
                                        if (res.data.vehicles[i].id > 0){
                                            allLineup.push(res.data.vehicles[i]);
                                        }                         
                                    }

                                    // console.log(allLineup);

                                    self.sortLineup(allLineup);

                                    // console.log(allLineup);
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

            self.get1rekisi();

            self.allies = [];
            self.enemies = [];

            for (var i = 0; i<list.length; i++){
                self.getStats(list[i]);
            }

            Promise.all(list)
                .then( function(){

                });

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
                        // console.log(temp);
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
        getClassNumber(value){
            if (value == "Battleship"){
                return 8;
            }else if (value == "Cruiser"){
                return 6;
            }else if (value == "Destroyer"){
                return 4;
            }else if (value == "AirCarrier"){
                return 10;
            }else if (value == "Submarine"){
                return 2;
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
                    console.log("Saved")
                })
        },
        save1rekisi(){
            var self = this;
            axios
                .put("http://localhost:10080/api/rekisi", {
                    rekisi: self.rekisi
                })
                .then( function(){
                    console.log("Saved 1rekisi");
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