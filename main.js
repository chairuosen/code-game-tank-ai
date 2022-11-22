var settings = {
    debug:1,
    findStar:1,
    findEnemy:1,
    print:{
        anti_debug:0,
        funny:0,
        end:0,
        turn:1,
        go:0,
        fire:1
    }
}
var lastPos = null;
var nextFrame = {
    stop:0,
    fire:0
}
var posCount = 0;
var dangerCount=0;
function getRdm(from,to){
    return parseInt(Math.random()*(to-from+1)+from);
}
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex ;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}
function in_array(needle, haystack, argStrict) {
    var key = '',
        strict = !! argStrict;
    if (strict) {
        for (key in haystack) {
            if (haystack[key] === needle) {
                return true;
            }
        }
    } else {
        for (key in haystack) {
            if (haystack[key] == needle) {
                return true;
            }
        }
    }
    return false;
}
// 开火策略 》 躲避子弹策略 》 寻找星星策略 》 寻找对手策略 》 转弯策略
var oppsiteWay = [2,3,0,1];
var hanzi = ['上','右','下','左'];
function getNumDirection(str){// 0,1,2,3 上，右，下，左
    return {
        'up':0,
        'right':1,
        'down':2,
        'left':3
    }[str];
}
var poetry = [
    '一百块都不给我',
    '你为什么还在笑',
    '我是抢劫的人么',
    '我抢劫你什么'
];
var isBot=false;
var bulletSnap = null;
var tankSnap = null;
function onIdle(me, enemy, game) {
    function log(){
        var arg = arguments.length>1?arguments:arguments[0];
        print(arg);
    }
    var STATIC = {
        x:game.map.length,
        y:game.map[0].length
    }
    if(enemy.tank){
        tankSnap =  {
            tank:enemy.tank,
            frame:game.frames
        }
    }
    if(enemy.bullet){
        bulletSnap = {
            bullet:enemy.bullet,
            frame:game.frames
        };
    }
    settings.print.anti_debug&&game.frames%4==1&&print(poetry[getRdm(0,poetry.length-1)]);
    me._go = me.go;
    me._turn = me.turn;
    me._fire = me.fire;
    me.go = function(n,debug){
        lastPos = me.tank.position;
        settings.print.go&&print('go : '+(debug?debug:""))
        return me._go(n);
    }
    me.turn = function(str,debug){
        settings.print.turn&&print('turn '+debug+' : '+hanzi[getNumDirection(str)]);
        return me._turn(str);
    }
    me.fire = function(str){
        settings.print.fire&&print('fire '+str);
        return me._fire();
    }
    function getDummyBullet(bulletSnap,currentFrame){
        //return enemy.bullet;
        if(!bulletSnap)return enemy.bullet;
        if(bulletSnap.frame==currentFrame)return enemy.bullet;
        var past = currentFrame - bulletSnap.frame;
        var distence = past * 2;
        var pos = bulletSnap.bullet.position;
        var noBlock,newPos;
        switch(bulletSnap.bullet.direction){
            case "up":
                newPos = [pos[0],pos[1]-distence];
                noBlock = checkY(pos[1],newPos[1],pos[0]);
                break;
            case "down":
                newPos = [pos[0],pos[1]+distence];
                noBlock = checkY(pos[1],newPos[1],pos[0]);
                break;
            case "left":
                newPos = [pos[0]-distence,pos[1]];
                noBlock = checkX(pos[0],newPos[0],pos[1]);
                break;
            case "right":
                newPos = [pos[0]+distence,pos[1]];
                noBlock = checkX(pos[0],newPos[0],pos[1]);
                break;
        }
        if(!noBlock){
            bulletSnap = null;
            return enemy.bullet;
        }
        return {
            position:newPos,
            direction:bulletSnap.bullet.direction
        }
    }
    function turnAbsolute(num,force,debug){// 0,1,2,3 上，右，下，左
        if(!force){
            if(me.tank.position[1]==1&& me.tank.position[0]!=STATIC.x-2 && me.tank.direction == 'up' && ( !game.star || game.star[1]!=1 ) ){
                num=1;
            }
            if(me.tank.position[1]==13&& me.tank.position[0]!=1 && me.tank.direction == 'down' && ( !game.star || game.star[1]!=STATIC.y-2 ) ){
                num=3;
            }
        }
        debug = debug || 'ab';
        var nowDirection = getNumDirection(me.tank.direction);
        var solution = [ // 0 = none; 1 = left ; 2= right;
            ['0','2','11','1'],//上
            ['1','0','2','11'],//右
            ['11','1','0','2'],//下
            ['2','11','1','0']//左
        ];
        var result = solution[nowDirection][num];
        switch(result){
            case"1":
                me.turn('left',debug);
                defaultGo = false;
                break;
            case"2":
                me.turn('right',debug);
                defaultGo = false;
                break;
            case"11":
                me.turn('left',debug);
                //me.turn('left',debug);
                defaultGo = false;
                break;
            default:
                break;
        }
    }
    // 转弯策略
    function checkAround(showAllData){ // 0,1,2,3 上，右，下，左
        var my = me.tank.position;
        var up,right,down,left;
        up = game.map[me.tank.position[0]][me.tank.position[1]-1] != "x";
        down = game.map[me.tank.position[0]][me.tank.position[1]+1] != "x";
        left = game.map[me.tank.position[0]-1][me.tank.position[1]] != "x";
        right = game.map[me.tank.position[0]+1][me.tank.position[1]] != "x";
        var result = [up,right,down,left];
        if(showAllData){
            return result;
        }
        var a = oppsiteWay[getNumDirection(me.tank.direction)];
        result[a] = false;
        var res = [];
        var res_print = [];
        for(var i in result){
            if(result[i]){
                res.push(i);
                res_print.push(hanzi[i])
            }
        }
        //print(res_print);
        shuffle(res);
        return res;
    }
    function checkSide(){
        var posibleDirection = checkAround();
        if(in_array(getNumDirection(me.tank.direction),posibleDirection)){
        }else{
            var targetDirection = posibleDirection[0];
            turnAbsolute(targetDirection,false,'side');
            me.go(1,"checkSide");
            defaultGo = false;
            return;
        }
    }
    // 检查障碍
    function checkX(fromX,toX,staticY,debug){
        if(fromX>toX){
            var max = fromX;
            var min = toX;
        }else{
            var min = fromX;
            var max = toX;
        }
        min = Math.max(0,min);
        max = Math.min(STATIC.x,max);
        for(var i=min;i<=max;i++){
            var current = game.map[i][staticY];
            if(current=='x'){
                return false;
            }
        }
        return true;
    }
    function checkY(fromY,toY,staticX){
        if(fromY>toY){
            var max = fromY;
            var min = toY;
        }else{
            var min = fromY;
            var max = toY;
        }
        min = Math.max(0,min);
        max = Math.min(STATIC.y,max);
        for(var i=min;i<=max;i++){
            if(game.map[staticX][i]=='x'){
                return false;
            }
        }
        return true;
    }
    //躲避子弹策略
    function checkDanger(){
        var bullet = enemy.bullet;
        var faceToMe = heIsFaceToMe();
        if(!bullet && !faceToMe)return null;
        if(!bullet && !enemy.tank){
            return null;
        }
        if(!bullet&&faceToMe){
            bullet = enemy.tank;
        }
        var bulletDir = getNumDirection(bullet.direction);
        var dangerStart = [bullet.position[0],bullet.position[1]];
        var defaultStop = [
            [dangerStart[0],0],// ^
            [STATIC.x-1,dangerStart[1]], // >
            [dangerStart[0],STATIC.y-1], // v
            [0,dangerStart[1]] //<
        ][getNumDirection(bullet.direction)]
        var result = {
            start:dangerStart,
            stop:defaultStop
        };
        [function(){ // up
            for( var i = result.start[1];i>0;i-- ){
                if(game.map[ result.start[0] ][i]=='x' ){
                    result.stop = [result.start[0],i+1];
                    break;
                }
            }
        },function(){  // right
            for( var i = result.start[0];i<STATIC.x-1;i++ ){
                if(game.map[i][ result.start[1] ]=='x' ){
                    result.stop = [i-1,result.start[1]];
                    break;
                }
            }
        },function(){  //down
            for( var i = result.start[1];i<STATIC.y-1;i++ ){
                if(game.map[ result.start[0] ][i]=='x' ){
                    result.stop = [result.start[0],i-1];
                    break;
                }
            }
        },function(){  // left
            for( var i = result.start[0];i>0;i-- ){
                if(game.map[i][ result.start[1] ]=='x' ){
                    result.stop = [i+1,result.start[1]];
                    break;
                }
            }
        }][getNumDirection(bullet.direction)]();
        if(result.start[0]>result.stop[0]){
            result = {
                start:result.stop,
                stop:dangerStart
            };
        }
        if(result.start[1]>result.stop[1]){
            result = {
                start:result.stop,
                stop:dangerStart
            };
        }
        if(result.stop[0]==result.start[0]){
            if(me.tank.position[1]<result.start[1] || me.tank.position[1]>result.stop[1]  ){
                return null;
            }
        }else{
            if(me.tank.position[0]<result.start[0] || me.tank.position[0]>result.stop[0]  ){
                return null;
            }
        }
        //if(enemy.bullet){
        //    dangerCount = parseInt(dangerLength/2);
        //    //print("CREATE DANGER COUNT : "+dangerCount);
        //}
        result['now'] = dangerStart;
        return result;
    }
    function getDangerLength(danger){
        if(!danger)return 0;
        var start = danger.now;
        var stop = me.tank.position;
        if(stop[0]==start[0]){
            return Math.abs(stop[1]-start[1]);
        }else if(stop[1]==start[1]){
            return Math.abs(stop[0]-start[0]);
        }else{
            return 0;
        }
    }
    function handleDanger(danger){
        var _break = false;
        var around = checkAround(true);
        var now = {
            x:me.tank.position[0],
            y:me.tank.position[1]
        }
        var l = getDangerLength(danger);
        var dangerLength = Math.max(Math.floor(l/2)-3,0);
        if(danger.start[0]==danger.stop[0]){  //纵向子弹
            if( now.x==danger.start[0] && now.y<=danger.stop[1] && now.y >= danger.start[1]  ){
                if(in_array(me.tank.direction,['left','right']) && around[getNumDirection(me.tank.direction)] ){
                    me.go(1,'h-danger 1');
                    _break = true;
                }else if(around[1]){
                    turnAbsolute(1,false,'h-danger 1');
                    me.go();
                    nextFrame.stop = dangerLength;
                    _break = true;
                }else if(around[3]){
                    turnAbsolute(3,false,'h-danger 3');
                    me.go();
                    nextFrame.stop = dangerLength;
                    _break = true;
                }
            }
        }else{        //横向子弹
            if( now.y==danger.start[1] && now.x<danger.stop[0] && now.x >= danger.start[0] ){
                if(in_array(me.tank.direction,['up','down']) && around[getNumDirection(me.tank.direction)]){
                    me.go(1,'h-danger 2');
                    _break = true;
                }else if(around[2]){
                    turnAbsolute(2,false,'h-danger 2');
                    me.go();
                    nextFrame.stop = dangerLength;
                    _break = true;
                }else if(around[0]){
                    turnAbsolute(0,false,'h-danger 4');
                    me.go();
                    nextFrame.stop = dangerLength;
                    _break = true;
                }
            }
        }
        return _break;
    }
    function heIsFaceToMe(my){
        if(!enemy.tank)return false;
        var result = false;
        var my = my ||me.tank.position;
        var he = enemy.tank.position;
        switch(enemy.tank.direction){
            case "up":
                if(he[0]==my[0]&&my[1]<he[1])result = true;
                break;
            case "down":
                if(he[0]==my[0]&&my[1]>he[1])result = true;
                break;
            case "right":
                if(he[0]<my[0]&&my[1]==he[1])result = true;
                break;
            case "left":
                if(he[0]>my[0]&&my[1]==he[1])result = true;
                break;
        }
        return result;
    }
    //开火策略
    function checkEnemy(){
        if (enemy.tank) {
            var danger = checkDanger();
            var faceToFace = heIsFaceToMe() && ( getNumDirection(enemy.tank.direction) == oppsiteWay[getNumDirection(me.tank.direction)] );
            var diff = {
                x:Math.abs(enemy.tank.position[0] - me.tank.position[0]),
                y:Math.abs(enemy.tank.position[1] - me.tank.position[1])
            }
            var veryClose = Math.max(diff.x,diff.y) < 4;
            if(danger ){
                if(faceToFace && veryClose ){
                }
                if(handleDanger(danger)){
                    print('DANGER!!')
                    return true;
                }
            }
            if (!me.bullet) {
                var noBlockVertical = checkY(me.tank.position[1],enemy.tank.position[1],me.tank.position[0]);
                var noBlockHorizon = checkX(me.tank.position[0],enemy.tank.position[0],me.tank.position[1]);
                var possibleDanger = !enemy.bullet && heIsFaceToMe();
                if (me.tank.position[0] === enemy.tank.position[0] &&  noBlockVertical && !possibleDanger ){
                    if(me.tank.position[1]>enemy.tank.position[1]){
                        turnAbsolute(0,true,'check-enemy');
                    }else{
                        turnAbsolute(2,true,'check-enemy');
                    }
                    me.fire('checkEnemy');
                    defaultGo = false;
                    return true;
                }else if(me.tank.position[1] === enemy.tank.position[1] && noBlockHorizon  && !possibleDanger ){
                    if(me.tank.position[0]>enemy.tank.position[0]){
                        turnAbsolute(3,true,'check-enemy');
                    }else{
                        turnAbsolute(1,true,'check-enemy');
                    }
                    me.fire('checkEnemy');
                    defaultGo = false;
                    return true;
                }
            }
        }
        if( lastPos && ( lastPos.join(',') == me.tank.position.join(',') ) ){
            posCount++;
            me.fire('stop');
            if(posCount>=1){
                defaultGo = false;
                nextFrame.fire = 1;
                posCount=0;
            }
        }else{
            posCount = 0;
        }
        return false;
    }
    function walkAround(){
        //寻找星星策略
        var __break = false;
        if(enemy.bullet){
            var danger = checkDanger(enemy.bullet)
            if(danger){
                var _break = handleDanger(danger);
                __break = _break;
                if(_break){
                    print('卧槽，快闪');
                    defaultGo = false;
                    return true;
                }
            }
        }
        if(settings.findStar && !stillInDanger && game.star){ //如果有星星优先找星星
            var enemyPos = game.star;
            var myPos = me.tank.position;
            var diff = {
                x:enemyPos[0] - me.tank.position[0],
                y:enemyPos[1] - me.tank.position[1]
            }
            var s11 = checkX(myPos[0],enemyPos[0],enemyPos[1]);
            var s12 = checkY(myPos[1],enemyPos[1],myPos[0]);
            var s1 = s11 && s12 ;
            var s21 = checkX(myPos[0],enemyPos[0],myPos[1] ,true);
            var s22 = checkY(myPos[1],enemyPos[1],enemyPos[0] ,true);
            var s2 = s21 && s22 ;
            //print([s11,s12,s21,s22]);
            if(enemy.tank){
                var diffE = {
                    x:enemy.tank.position[0] - me.tank.position[0],
                    y:enemy.tank.position[1] - me.tank.position[1]
                }
                var positionIsClose = (Math.abs(diffE.x)==1&&Math.abs(diffE.y)==1);
                var ePos = enemy.tank.position;
                if( checkX(myPos[0],ePos[0],myPos[1]) && checkY(myPos[1],ePos[1],ePos[0]) && in_array(me.tank.direction,['left','right']) ){
                    var a = (Math.floor(Math.abs(diffE.x)-1/2)==(Math.abs(diffE.y)+1));
                    if( (  a   || positionIsClose )  && ( (enemy.tank.direction=="down"&&diffE.y<0) || (enemy.tank.direction=="up"&&diffE.y>0)  ) ){
                        me.fire('pre - star');
                        defaultGo = false;
                    }
                }else if(  checkX(myPos[0],ePos[0],ePos[1]) && checkY(myPos[1],ePos[1],myPos[0]) && in_array(me.tank.direction,['up','down']) ){
                    var a = Math.floor((Math.abs(diffE.y)-1)/2 )==Math.abs(diffE.x) || positionIsClose;
                    var b = (  (enemy.tank.direction=="left"&&diffE.x>0) || (enemy.tank.direction=="right"&&diffE.x<0)  )
                    if(a  &&  b  ){
                        me.fire('pre - star');
                        defaultGo = false;
                    }
                }
            }
            if(myPos[1]==enemyPos[1] && myPos[0] == enemyPos[0]-1 && (s1||s2) ){
                turnAbsolute(1,false,'star');
                __break = true;
            }else if(myPos[1]==enemyPos[1] && myPos[0] == enemyPos[0]+1 && (s1||s2)){
                turnAbsolute(3,false,'star');
                __break = true;
            }else if(myPos[0]==enemyPos[0] && myPos[1] == enemyPos[1]-1 && (s1||s2)){
                turnAbsolute(2,false,'star');
                __break = true;
            }else if(myPos[0]==enemyPos[0] && myPos[1] == enemyPos[1]+1 && (s1||s2)){
                turnAbsolute(0,false,'star');
                __break = true;
            }else if(diff.y!=0 && s1 ){
                settings.print.funny&&print('先打野攒钱')
                if(diff.y>0){
                    turnAbsolute(2,false,'star');
                    __break = true;
                }else if(diff.y<0){
                    turnAbsolute(0,false,'star');
                    __break = true;
                }
            }else if(diff.x!=0 && s2 ){
                settings.print.funny&&print('先打野攒钱')
                if(diff.x>0){
                    turnAbsolute(1,false,'star');
                    __break = true;
                }else if(diff.x<0){
                    turnAbsolute(3,false,'star');
                    __break = true;
                }
            }
        }else if( settings.findEnemy&& !stillInDanger && enemy.tank){
            var enemyPos = enemy.tank.position;
            var myPos = me.tank.position;
            var diff = {
                x:enemy.tank.position[0] - me.tank.position[0],
                y:enemy.tank.position[1] - me.tank.position[1]
            }
            var positionIsClose = (Math.abs(diff.x)==1&&Math.abs(diff.y)==1);
            //如果我跟敌人之间有L型路线可以到达
            if( checkX(myPos[0],enemyPos[0],myPos[1]) && checkY(myPos[1],enemyPos[1],enemyPos[0]) ){
                settings.print.funny&&print('对面的小哥我来啦');
                var targetDir;
                if(diff.x>0){
                    targetDir = 1;
                }else if(diff.x<0){
                    targetDir = 3;
                }
                if(targetDir||targetDir==0){
                    turnAbsolute(targetDir,false,'findEnemy');
                    __break = true;
                }
                if( ( parseInt(Math.abs(diff.x)/2)==Math.abs(diff.y) || positionIsClose ) && ( !targetDir || getNumDirection(me.tank.direction)!=oppsiteWay[targetDir]  )  && ( (enemy.tank.direction=="down"&&diff.y<0) || (enemy.tank.direction=="up"&&diff.y>0)  ) ){
                    me.fire('pre 1');
                    __break = true;
                }
            }else if( checkX(myPos[0],enemyPos[0],enemyPos[1]) && checkY(myPos[1],enemyPos[1],myPos[0]) ){
                settings.print.funny&&print('对面的小哥我来啦');
                var targetDir;
                if(diff.y>0){
                    targetDir = 2;
                }else if(diff.y<0){
                    targetDir = 0;
                }
                if(targetDir||targetDir==0){
                    turnAbsolute(targetDir,false,'findEnemy');
                    __break = true;
                }
                if( ( parseInt(Math.abs(diff.y)/2)==Math.abs(diff.x) || positionIsClose ) && ( !targetDir || getNumDirection(me.tank.direction)!=oppsiteWay[targetDir]  )  &&   (  (enemy.tank.direction=="left"&&diff.x>0) || (enemy.tank.direction=="right"&&diff.x<0)  )  ){
                    me.fire('pre 2');
                    __break = true;
                }
            }
        }
        return __break;
    }
    function getMyNextStep(){
        switch(me.tank.direction){
            case "up":
                return [me.tank.position[0],me.tank.position[1]-1];
                break;
            case "down":
                return [me.tank.position[0],me.tank.position[1]+1];
                break;
            case "left":
                return [me.tank.position[0]-1,me.tank.position[1]];
                break;
            case "right":
                return [me.tank.position[0]+1,me.tank.position[1]];
                break;
        }
    }
    function myNextStepIsSafe(){
        var SAFE_LENGTH = 6;
        if(!enemy.tank)return {status:true,reason:'no-tank'};
        var nextStep = getMyNextStep();
        var faceToMe = heIsFaceToMe(nextStep);
        if(!faceToMe)return {status:true,reason:'not-face-to-me'};
        if(nextStep[1]==enemy.tank.position[1]){
            if(Math.abs(nextStep[0]-enemy.tank.position[0])>SAFE_LENGTH){
                return {status:true,reason:'so-far-from-me'};
            }
        }else{
            if(Math.abs(nextStep[1]-enemy.tank.position[1])>SAFE_LENGTH){
                return {status:true,reason:'so-far-from-me'};
            }
        }
        var noBlock;
        if(in_array(enemy.tank.direction,['up','down'])){
            noBlock = checkY(enemy.tank.position[1],nextStep[1],nextStep[0]);
        }else{
            noBlock = checkX(enemy.tank.position[0],nextStep[0],nextStep[1]);
        }
        return {status:!noBlock,reason:'no-block'};
    }
    function getDummyEnemyTank(tankSnap,frame){
        if(!tankSnap || enemy.tank)return enemy.tank;
        var r = (frame - tankSnap.frame)
        if(!enemy.tank && r <= 2 ){
            var pos = [
                tankSnap.tank.position[0],
                tankSnap.tank.position[1]
            ];
            [function(){  // shang
                pos[1]--;
            },function(){  //you 
                pos[0]++;
            },function(){  //xia
                pos[1]++;
            },function(){  //zuo
                pos[0]--;
            }][getNumDirection(tankSnap.tank.direction)]();
            var result = {
                position:pos,
                direction:tankSnap.tank.direction
            };
            return result;
        }else{
            return null;
        }
    }
    enemy.tank = getDummyEnemyTank(tankSnap,game.frames);
    enemy.bullet = getDummyBullet(bulletSnap,game.frames);
    if(game.frames==1&&me.tank.position[0]>10){
        isBot=true;
    }
    if(isBot&&settings.debug){
        settings.print = {};
        log = function(){}
    }
    if(nextFrame.stop>0){
        nextFrame.stop--;
        return;
    }
    if(nextFrame.fire>1){
        nextFrame.fire=0;
        lastPos=[0,0]
        me.fire('fromLastFrame');
        return;
    }
    var defaultGo = true;
    var stillInDanger = false;
    if(dangerCount>0){
        dangerCount --;
        //stillInDanger = true;
    }else{
        dangerCount = 0;
    }
    !checkEnemy()&&!walkAround()&&checkSide();
    if(defaultGo){
        var safe = myNextStepIsSafe();
        var danger = checkDanger();
        if(safe.status ){
            me.go(1,'default');
        }else if(!danger){
            settings.print.fire&&log('Order:defaultGo, but not safe',safe,danger)
        }
    }
    settings.print.end&&print('========= frame end === '+game.frames+' ==============')
}
