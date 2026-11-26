"use strict";

const ACCOUNTS_KEY="snakeNG_accounts_v1";
const SESSION_KEY="snakeNG_session_v1";
const MUSIC_KEY="snakeNG_music_v1";

let accounts={};
try{accounts=JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||"{}")||{};}
catch(e){accounts={};}
let currentUser=null;

const skins={
 default:{name:"Классика",color:"#55ff8b",price:0},
 apple:{name:"Яблоко",color:"#ff4545",price:100},
 orange:{name:"Апельсин",color:"#ffad35",price:180},
 cosmic:{name:"Космос",color:"#a16aff",price:300},
 rainbow:{name:"Радуга",color:"rainbow",price:500}
};

let musicEnabled=localStorage.getItem(MUSIC_KEY)!=="false";
let audioContext=null,musicTimer=null,musicNote=0;

function saveAccounts(){localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts));}
function saveUser(){if(!currentUser)return;accounts[currentUser.name]=currentUser;saveAccounts();}
function updateStats(){
 if(!currentUser)return;
 document.getElementById("menuXP").textContent=currentUser.xp;
 document.getElementById("menuCoins").textContent=currentUser.coins;
 document.getElementById("shopCoins").textContent=currentUser.coins;
 document.getElementById("gameXP").textContent=currentUser.xp;
 document.getElementById("welcome").textContent="Привет, "+currentUser.name+"!";
}
function normalizeUser(user){
 if(!Array.isArray(user.ownedSkins))user.ownedSkins=["default"];
 if(!user.ownedSkins.includes("default"))user.ownedSkins.unshift("default");
 if(!skins[user.equippedSkin])user.equippedSkin="default";
 if(!Number.isFinite(user.xp))user.xp=0;
 if(!Number.isFinite(user.coins))user.coins=0;
 if(typeof user.goldBonusClaimed!=="boolean")user.goldBonusClaimed=false;
}
function register(){
 const name=document.getElementById("username").value.trim();
 const pass=document.getElementById("password").value;
 const message=document.getElementById("authMessage");
 if(name.length<3||name.length>18){message.textContent="Имя должно содержать 3–18 символов";return;}
 if(pass.length<4){message.textContent="Пароль должен содержать минимум 4 символа";return;}
 if(accounts[name]){message.textContent="Такой аккаунт уже существует";return;}
 currentUser={name,password:pass,xp:0,coins:0,ownedSkins:["default"],equippedSkin:"default",goldBonusClaimed:false};
 accounts[name]=currentUser;saveUser();localStorage.setItem(SESSION_KEY,name);enterGame();
}
function login(){
 const name=document.getElementById("username").value.trim();
 const pass=document.getElementById("password").value;
 const message=document.getElementById("authMessage");
 if(!accounts[name]||accounts[name].password!==pass){message.textContent="Неверное имя или пароль";return;}
 currentUser=accounts[name];normalizeUser(currentUser);saveUser();
 localStorage.setItem(SESSION_KEY,name);enterGame();
}
function enterGame(){showOnly("menuScreen");updateStats();startMenuMusic();}
function logout(){
 if(!confirm("Выйти из аккаунта?"))return;
 saveUser();currentUser=null;localStorage.removeItem(SESSION_KEY);
 document.getElementById("username").value="";
 document.getElementById("password").value="";
 document.getElementById("authMessage").textContent="";
 showOnly("loginScreen");
}
function showOnly(id){
 ["loginScreen","menuScreen","shopScreen","gameScreen","gameOverScreen"].forEach(x=>document.getElementById(x).classList.add("hidden"));
 document.getElementById(id).classList.remove("hidden");
 const playing=id==="gameScreen";
 document.getElementById("mainHeader").classList.toggle("hidden",playing||id==="loginScreen");
 document.getElementById("footer").classList.toggle("hidden",playing||id==="loginScreen");
 if(playing)resizeCanvas();
}
function showShop(){updateStats();renderSkins();showOnly("shopScreen");}
function renderSkins(){
 const box=document.getElementById("skinsList");box.innerHTML="";
 Object.entries(skins).forEach(([id,skin])=>{
  const owned=currentUser.ownedSkins.includes(id),equipped=currentUser.equippedSkin===id;
  const div=document.createElement("div");div.className="skin";
  const color=skin.color==="rainbow"?"linear-gradient(90deg,red,orange,yellow,green,blue,violet)":skin.color;
  div.innerHTML=`<div style="width:35px;height:35px;border-radius:50%;margin:auto;background:${color}"></div>
   <b>${skin.name}</b><br><small>${skin.price===0?"Бесплатно":skin.price+" монет"}</small><br>
   <button>${equipped?"НАДЕТО":owned?"НАДЕТЬ":"КУПИТЬ"}</button>`;
  div.querySelector("button").onclick=()=>buyOrEquip(id);box.appendChild(div);
 });
}
function buyOrEquip(id){
 const skin=skins[id];
 if(currentUser.ownedSkins.includes(id))currentUser.equippedSkin=id;
 else{
  if(currentUser.coins<skin.price){alert("Недостаточно монет!");return;}
  currentUser.coins-=skin.price;currentUser.ownedSkins.push(id);currentUser.equippedSkin=id;
 }
 saveUser();updateStats();renderSkins();
}
function claimGold(){
 if(currentUser.goldBonusClaimed){alert("Бонус уже получен!");return;}
 currentUser.goldBonusClaimed=true;currentUser.coins+=100;currentUser.xp+=25;
 saveUser();updateStats();alert("Ты получил 100 монет и 25 XP!");
}

/* Музыка */
function startMenuMusic(){
 if(!musicEnabled)return;
 try{
  if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==="suspended")audioContext.resume();
  if(musicTimer)return;
  const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,329.63,392,523.25,440,392,329.63,293.66];
  musicTimer=setInterval(()=>{
   if(!musicEnabled||!audioContext)return;
   const osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type="sine";osc.frequency.value=notes[musicNote%notes.length];
   gain.gain.setValueAtTime(0.0001,audioContext.currentTime);
   gain.gain.exponentialRampToValueAtTime(0.045,audioContext.currentTime+0.08);
   gain.gain.exponentialRampToValueAtTime(0.0001,audioContext.currentTime+0.65);
   osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+0.7);musicNote++;
  },650);
 }catch(e){}
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}
function toggleMusic(){
 musicEnabled=!musicEnabled;localStorage.setItem(MUSIC_KEY,String(musicEnabled));
 updateMusicButton();if(musicEnabled)startMenuMusic();else stopMusic();
}
function updateMusicButton(){document.getElementById("musicButton").textContent=musicEnabled?"🎵 ВЫКЛЮЧИТЬ МУЗЫКУ":"🔇 ВКЛЮЧИТЬ МУЗЫКУ";}
document.addEventListener("pointerdown",()=>{if(musicEnabled)startMenuMusic();},{passive:true});
document.addEventListener("keydown",()=>{if(musicEnabled)startMenuMusic();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&musicEnabled)startMenuMusic();});

/* Игровой процесс */
const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
let cols=20,rows=20,cellW=28,cellH=28;
let snake=[],previousSnake=[],food,direction,nextDirection;
let obstacles=[],enemies=[],score=0,wave=1;
let running=false,paused=false,animationId=null;
let lastStepTime=0,currentSpeed=180;
const goals=[20,30,40,70];

function resizeCanvas(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);cellW=rect.width/cols;cellH=rect.height/rows;
 if(running)drawGame(1);
}
window.addEventListener("resize",()=>{if(!document.getElementById("gameScreen").classList.contains("hidden"))resizeCanvas();});
function randomCell(){return{x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)};}
function same(a,b){return a.x===b.x&&a.y===b.y;}
function occupied(p){return snake.some(s=>same(s,p))||obstacles.some(s=>same(s,p))||enemies.some(s=>same(s,p));}
function makeFood(){
 let p,attempts=0;
 do{p=randomCell();attempts++;}while(occupied(p)&&attempts<cols*rows);
 return p;
}
function makeObstacles(){
 obstacles=[];const count=Math.floor(cols*rows*.018)+wave*2;
 for(let i=0;i<count;i++){const p=randomCell();if(!occupied(p)&&!same(p,food))obstacles.push(p);}
}
function makeEnemies(){
 enemies=[];
 if(wave>=4)for(let i=0;i<2;i++){const p=randomCell();if(!occupied(p))enemies.push(p);}
}
function startGame(){
 showOnly("gameScreen");resizeCanvas();score=0;wave=1;
 const cx=Math.floor(cols/2),cy=Math.floor(rows/2);
 snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
 previousSnake=snake.map(s=>({...s}));direction={x:1,y:0};nextDirection={x:1,y:0};
 obstacles=[];enemies=[];food=makeFood();currentSpeed=180;makeObstacles();makeEnemies();
 running=true;paused=false;lastStepTime=performance.now();updateGameUI();
 cancelAnimationFrame(animationId);animationId=requestAnimationFrame(gameFrame);
}
function updateGameUI(){
 document.getElementById("score").textContent=score;document.getElementById("wave").textContent=wave;
 document.getElementById("gameXP").textContent=currentUser.xp;
 document.getElementById("goalText").textContent=paused?"ПАУЗА":"Цель волны: "+(goals[wave-1]||70)+" яблок";
}
function setDirection(x,y){if(!running||paused)return;if(x===-direction.x&&y===-direction.y)return;nextDirection={x,y};}
function pauseGame(){if(!running)return;paused=!paused;if(!paused)lastStepTime=performance.now();updateGameUI();drawGame(1);}
function gameFrame(time){
 if(!running)return;
 if(!paused){
  let progress=Math.min(1,(time-lastStepTime)/currentSpeed);
  if(time-lastStepTime>=currentSpeed){stepGame();lastStepTime=time;progress=0;}
  drawGame(progress);
 }
 animationId=requestAnimationFrame(gameFrame);
}
function stepGame(){
 previousSnake=snake.map(s=>({...s}));direction=nextDirection;
 const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
 if(head.x<0||head.x>=cols||head.y<0||head.y>=rows){endGame(false);return;}
 if(snake.some((s,i)=>i>0&&same(s,head))||obstacles.some(o=>same(o,head))||enemies.some(e=>same(e,head))){endGame(false);return;}
 snake.unshift(head);
 if(same(head,food)){
  score++;currentUser.xp+=2;currentUser.coins+=3;food=makeFood();
  if(score%5===0)saveUser();
  const goal=goals[wave-1]||70;
  if(score>=goal){
   if(wave>=4){endGame(true);return;}
   wave++;score=0;currentUser.xp+=20;currentUser.coins+=20;
   currentSpeed=Math.max(95,currentSpeed-15);makeObstacles();makeEnemies();food=makeFood();
  }
 }else snake.pop();
 moveEnemies();updateGameUI();
}
function moveEnemies(){
 if(wave<4||Math.random()>.35)return;
 enemies.forEach(enemy=>{
  const options=[{x:enemy.x+1,y:enemy.y},{x:enemy.x-1,y:enemy.y},{x:enemy.x,y:enemy.y+1},{x:enemy.x,y:enemy.y-1}]
   .filter(p=>p.x>=0&&p.x<cols&&p.y>=0&&p.y<rows&&!obstacles.some(o=>same(o,p))&&!snake.some(s=>same(s,p)));
  if(options.length){const target=options[Math.floor(Math.random()*options.length)];enemy.x=target.x;enemy.y=target.y;}
 });
}
function drawGame(progress=1){
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#0a1a12";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="#183a29";ctx.lineWidth=.7;
 for(let i=0;i<=cols;i++){ctx.beginPath();ctx.moveTo(i*cellW,0);ctx.lineTo(i*cellW,h);ctx.stroke();}
 for(let i=0;i<=rows;i++){ctx.beginPath();ctx.moveTo(0,i*cellH);ctx.lineTo(w,i*cellH);ctx.stroke();}
 obstacles.forEach(o=>{
  ctx.fillStyle="#858b91";ctx.fillRect(o.x*cellW+2,o.y*cellH+2,cellW-4,cellH-4);
  ctx.fillStyle="#aeb6ba";ctx.fillRect(o.x*cellW+5,o.y*cellH+5,Math.max(3,cellW*.18),Math.max(3,cellH*.18));
 });
 enemies.forEach(e=>{
  ctx.fillStyle="#ff4c61";ctx.beginPath();ctx.arc((e.x+.5)*cellW,(e.y+.5)*cellH,Math.min(cellW,cellH)*.38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="white";ctx.fillRect(e.x*cellW+cellW*.25,e.y*cellH+cellH*.3,4,4);ctx.fillRect(e.x*cellW+cellW*.62,e.y*cellH+cellH*.3,4,4);
 });
 ctx.fillStyle="#ff4141";ctx.beginPath();ctx.arc((food.x+.5)*cellW,(food.y+.5)*cellH,Math.min(cellW,cellH)*.38,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#7dff8d";ctx.fillRect(food.x*cellW+cellW*.44,food.y*cellH+1,Math.max(3,cellW*.13),Math.max(5,cellH*.2));
 drawSnake(progress);
 if(paused){ctx.fillStyle="#0009";ctx.fillRect(0,0,w,h);ctx.fillStyle="white";ctx.font="bold 34px Arial";ctx.textAlign="center";ctx.fillText("ПАУЗА",w/2,h/2);}
}
function drawSnake(progress){
 const skin=skins[currentUser.equippedSkin]||skins.default;
 snake.forEach((part,i)=>{
  const old=previousSnake[i]||part;let dx=part.x-old.x,dy=part.y-old.y;
  if(Math.abs(dx)>1)dx=0;if(Math.abs(dy)>1)dy=0;
  const x=(old.x+dx*progress)*cellW,y=(old.y+dy*progress)*cellH;
  ctx.fillStyle=skin.color==="rainbow"?`hsl(${(i*25+Date.now()/20)%360},90%,60%)`:skin.color;
  ctx.beginPath();ctx.roundRect(x+1,y+1,cellW-2,cellH-2,Math.min(8,cellW*.25));ctx.fill();
  if(i===0){
   ctx.fillStyle="#092016";
   const eyeX=direction.x===1?x+cellW*.68:direction.x===-1?x+cellW*.2:x+cellW*.32;
   const eyeY=direction.y===1?y+cellH*.68:direction.y===-1?y+cellH*.2:y+cellH*.25;
   ctx.fillRect(eyeX,eyeY,4,4);
   ctx.fillRect(eyeX+(direction.y===0?0:cellW*.25),eyeY+(direction.x===0?0:cellH*.25),4,4);
  }
 });
}
function endGame(won){
 running=false;cancelAnimationFrame(animationId);saveUser();updateStats();showOnly("gameOverScreen");
 document.getElementById("endTitle").textContent=won?"🏆 ПОБЕДА!":"ИГРА ОКОНЧЕНА";
 document.getElementById("endText").textContent=won?"Ты прошёл все 4 волны! Награда: 100 монет и 100 XP.":"Собрано яблок: "+score+". Волна: "+wave+".";
 if(won){currentUser.coins+=100;currentUser.xp+=100;saveUser();updateStats();}
}
function backToMenu(){running=false;cancelAnimationFrame(animationId);saveUser();updateStats();showOnly("menuScreen");}

/* Свайпы и клавиатура */
let touchStartX=0,touchStartY=0;
canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];touchStartX=t.clientX;touchStartY=t.clientY;},{passive:true});
canvas.addEventListener("touchend",e=>{
 const t=e.changedTouches[0],dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;
 if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;
 if(Math.abs(dx)>Math.abs(dy))setDirection(dx>0?1:-1,0);else setDirection(0,dy>0?1:-1);
},{passive:true});
document.addEventListener("keydown",e=>{
 const keys={ArrowUp:[0,-1],w:[0,-1],ц:[0,-1],ArrowDown:[0,1],s:[0,1],ы:[0,1],
 ArrowLeft:[-1,0],a:[-1,0],ф:[-1,0],ArrowRight:[1,0],d:[1,0],в:[1,0]};
 if(keys[e.key]){e.preventDefault();setDirection(...keys[e.key]);}
 if(e.key===" "&&running){e.preventDefault();pauseGame();}
});

/* Автовход */
function initializeApp(){
 updateMusicButton();
 const savedSession=localStorage.getItem(SESSION_KEY);
 if(savedSession&&accounts[savedSession]){
  currentUser=accounts[savedSession];normalizeUser(currentUser);enterGame();
 }else{
  currentUser=null;localStorage.removeItem(SESSION_KEY);showOnly("loginScreen");
 }
}
initializeApp();
