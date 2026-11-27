"use strict";
const ACCOUNTS_KEY="snakeNG_accounts_v1",SESSION_KEY="snakeNG_session_v1",MUSIC_KEY="snakeNG_music_v1";
let accounts={};
try{accounts=JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||"{}")||{};}catch(e){accounts={};}
let currentUser=null;

const baseSkins={
 kitsune_blue:{name:"🦊 Переливающаяся Китцуне",color:"kitsune",price:2000,limited:true},
 default:{name:"Классика",color:"#55ff8b",price:0},
 apple:{name:"Яблоко",color:"#ff4545",price:100},
 orange:{name:"Апельсин",color:"#ffad35",price:180},
 cosmic:{name:"Космос",color:"#a16aff",price:300},
 rainbow:{name:"Радуга",color:"rainbow",price:500}
};
const caseSkins={
 black:{name:"Чёрная",color:"#171717",caseOnly:true},
 white:{name:"Белая",color:"#ffffff",caseOnly:true},
 yellow:{name:"Жёлтая",color:"#ffe600",caseOnly:true},
 green:{name:"Зелёная",color:"#00d95a",caseOnly:true}
};
const BONUS_COLORS=["#00d9ff","#ff00cc","#ffee00","#ffffff","#ff7800","#00ffcc","#baff00","#ff66aa"];

function getSkins(){
 const all={...baseSkins,...caseSkins};
 (currentUser?.bonusSkins||[]).forEach(item=>{all[item.id]={name:item.name||"Бонусный цвет",color:item.color,price:0};});
 return all;
}
let musicEnabled=localStorage.getItem(MUSIC_KEY)!=="false",audioContext=null,musicTimer=null;

function saveAccounts(){localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts));}
function saveUser(){if(!currentUser)return;accounts[currentUser.name]=currentUser;saveAccounts();}
function normalizeUser(u){
 if(!Array.isArray(u.ownedSkins))u.ownedSkins=["default"];
 if(!u.ownedSkins.includes("default"))u.ownedSkins.push("default");
 if(!Array.isArray(u.bonusSkins))u.bonusSkins=[];
 if(!Array.isArray(u.redeemedPromos))u.redeemedPromos=[];
 if(!["noob","pro","cheater","admin"].includes(u.tag))u.tag="noob";
 if(!Number.isFinite(u.tagPaidThrough))u.tagPaidThrough=Date.now();
 if(typeof u.adminPromoClaimed!=="boolean")u.adminPromoClaimed=false;
 if(!u.equippedSkin)u.equippedSkin="default";
 if(!Number.isFinite(u.xp))u.xp=0;
 if(!Number.isFinite(u.coins))u.coins=0;
 if(typeof u.goldBonusClaimed!=="boolean")u.goldBonusClaimed=false;
 processTagIncome(u);
}
function updateStats(){
 if(!currentUser)return;
 processTagIncome(currentUser);
 menuXP.textContent=currentUser.xp;menuCoins.textContent=currentUser.coins;
 shopCoins.textContent=currentUser.coins;gameXP.textContent=currentUser.xp;
 welcome.textContent="Привет, "+currentUser.name+"!";
 const adminBox=document.getElementById("adminWithdraw");
 if(adminBox)adminBox.classList.toggle("hidden",currentUser.tag!=="admin");
 const tagLabel=document.getElementById("currentTag");
 if(tagLabel)tagLabel.textContent=tagNames[currentUser.tag]||"НУБ";
}
const tagNames={noob:"НУБ",pro:"PRO",cheater:"ЧИТЕР",admin:"АДМИН"};
const tagInfo=[
 {id:"noob",name:"НУБ",price:0,coins:0,desc:"Стартовый тэг для всех"},
 {id:"pro",name:"PRO",price:500,coins:50,desc:"+50 монет каждые 6 часов"},
 {id:"cheater",name:"ЧИТЕР",price:1500,coins:100,desc:"+100 монет каждые 6 часов"}
];
function processTagIncome(u){
 if(!u)return;
 const now=Date.now(),rate=u.tag==="pro"?50:u.tag==="cheater"?100:0;
 if(!Number.isFinite(u.tagPaidThrough)||u.tagPaidThrough<=0)u.tagPaidThrough=now;
 const periods=Math.floor(Math.max(0,now-u.tagPaidThrough)/21600000);
 if(periods>0){
  if(rate)u.coins=(Number(u.coins)||0)+periods*rate;
  u.tagPaidThrough+=periods*21600000;
  if(u===currentUser)saveUser();
 }
}
function showResult(title,message){
 document.getElementById("resultTitle").textContent=title;
 document.getElementById("resultText").textContent=message;
 document.getElementById("resultOverlay").classList.remove("hidden");
}
function closeResult(){document.getElementById("resultOverlay").classList.add("hidden");}
function showTags(){renderTags();showOnly("tagsScreen");}
function renderTags(){
 const box=document.getElementById("tagsList");box.innerHTML="";
 tagInfo.forEach(t=>{
  const card=document.createElement("div");card.className="tagCard";
  const badge=document.createElement("span");badge.className="tagBadge";badge.textContent=t.name;
  const desc=document.createElement("div");desc.className="small";desc.textContent=t.desc;
  const price=document.createElement("b");price.textContent=t.price===0?"Бесплатно":t.price+" монет";
  const btn=document.createElement("button"),owned=currentUser.tag===t.id;
  btn.textContent=owned?"УСТАНОВЛЕН":"КУПИТЬ";btn.disabled=owned;btn.onclick=()=>buyTag(t.id);
  card.append(badge,desc,price,btn);box.append(card);
 });
}
function buyTag(id){
 const t=tagInfo.find(x=>x.id===id);if(!t||!currentUser)return;
 if(id==="noob"){showResult("🏷️ ТЭГ НУБ","Он уже есть у каждого аккаунта.");return;}
 if(currentUser.tag===id){showResult("🏷️ УЖЕ ЕСТЬ","Этот тэг уже установлен.");return;}
 if(currentUser.coins<t.price){showResult("❌ НЕ ХВАТАЕТ МОНЕТ","Для тэга "+t.name+" нужно "+t.price+" монет.");return;}
 currentUser.coins-=t.price;currentUser.tag=id;currentUser.tagPaidThrough=Date.now();
 saveUser();updateStats();renderTags();
 showResult("🎉 ТЭГ ПОЛУЧЕН","Ты купил тэг "+t.name+"! Каждые 6 часов начисляется "+t.coins+" монет, даже офлайн.");
}
function adminWithdraw(){
 if(!currentUser||currentUser.tag!=="admin")return;
 const field=document.getElementById("withdrawAmount"),amount=Math.floor(Number(field.value));
 if(!Number.isSafeInteger(amount)||amount<1){showResult("⚠️ НЕВЕРНАЯ СУММА","Введи целое число монет больше нуля.");return;}
 currentUser.coins+=amount;field.value="";saveUser();updateStats();
 showResult("👑 АДМИН-НАЧИСЛЕНИЕ","Начислено "+amount.toLocaleString("ru-RU")+" монет.");
}
function register(){
 const name=username.value.trim(),pass=password.value;
 if(name.length<3||name.length>18){authMessage.textContent="Имя должно содержать 3–18 символов";return;}
 if(pass.length<4){authMessage.textContent="Пароль должен содержать минимум 4 символа";return;}
 if(accounts[name]){authMessage.textContent="Такой аккаунт уже существует";return;}
 currentUser={name,password:pass,xp:0,coins:0,ownedSkins:["default"],bonusSkins:[],redeemedPromos:[],tag:"noob",tagPaidThrough:Date.now(),adminPromoClaimed:false,equippedSkin:"default",goldBonusClaimed:false};
 accounts[name]=currentUser;saveUser();localStorage.setItem(SESSION_KEY,name);enterGame();
}
function login(){
 const name=username.value.trim(),pass=password.value;
 if(!accounts[name]||accounts[name].password!==pass){authMessage.textContent="Неверное имя или пароль";return;}
 currentUser=accounts[name];normalizeUser(currentUser);saveUser();localStorage.setItem(SESSION_KEY,name);enterGame();
}
function enterGame(){if(currentUser){processTagIncome(currentUser);saveUser();}showOnly("menuScreen");updateStats();startMenuMusic();}
function logout(){
 if(!confirm("Выйти из аккаунта?"))return;
 saveUser();currentUser=null;localStorage.removeItem(SESSION_KEY);
 username.value="";password.value="";authMessage.textContent="";showOnly("loginScreen");
}
function showOnly(id){
 ["loadingScreen","loginScreen","menuScreen","shopScreen","promoScreen","gameScreen","gameOverScreen","caseInfoScreen"].forEach(x=>document.getElementById(x).classList.add("hidden"));
 document.getElementById(id).classList.remove("hidden");
 const playing=id==="gameScreen";
 mainHeader.classList.toggle("hidden",playing||id==="loginScreen");
 footer.classList.toggle("hidden",playing||id==="loginScreen");
 if(playing)resizeCanvas();
}
function showShop(){updateStats();renderSkins();showOnly("shopScreen");}

function renderSkins(){
 const box=skinsList;box.innerHTML="";
 Object.entries(getSkins()).forEach(([id,skin])=>{
  const owned=currentUser.ownedSkins.includes(id),equipped=currentUser.equippedSkin===id;
  const chance=getCaseChances()[id];
  const div=document.createElement("div");div.className="skin"+(skin.color==="kitsune"?" kitsune":"");
  const preview=document.createElement("div");preview.className="skinPreview";
  preview.style.background=skin.color==="rainbow"?"linear-gradient(90deg,red,orange,yellow,green,blue,violet)":skin.color==="kitsune"?"linear-gradient(135deg,#00eaff,#286cff,#bd8aff,#00eaff)":skin.color;
  if(skin.color==="kitsune")preview.style.boxShadow="0 0 18px #00cfff";
  const title=document.createElement("b");title.textContent=skin.name;
  const price=document.createElement("div");price.className="small";
  if(skin.limited)price.textContent="🪙 Цена: "+skin.price+" монет · ✨ LIMITED EDITION";
  else if(skin.caseOnly)price.textContent="🔒 ДОСТУПНА ТОЛЬКО ИЗ КЕЙСА";
  else price.textContent=skin.price===0?"Бесплатно":skin.price+" монет";
  if(chance!==undefined)price.textContent+=" · Шанс: "+chance.toFixed(1)+"%";
  const button=document.createElement("button");
  button.textContent=equipped?"НАДЕТО":owned?"НАДЕТЬ":skin.caseOnly?"ТОЛЬКО ИЗ КЕЙСА":"КУПИТЬ";
  button.disabled=skin.caseOnly&&!owned;
  button.onclick=()=>buyOrEquip(id);
  div.append(preview,title,price,button);box.appendChild(div);
 });
}
function buyOrEquip(id){
 const skin=getSkins()[id];if(!skin)return;
 if(skin.caseOnly&&!currentUser.ownedSkins.includes(id)){alert("Эту змейку можно получить только из сундука!");return;}
 if(currentUser.ownedSkins.includes(id))currentUser.equippedSkin=id;
 else{
  if(currentUser.coins<skin.price){alert("Недостаточно монет!");return;}
  currentUser.coins-=skin.price;currentUser.ownedSkins.push(id);currentUser.equippedSkin=id;
 }
 saveUser();updateStats();renderSkins();
 showResult(owned?"✨ СКИН НАДЕТ":"🎉 ПОКУПКА УСПЕШНА",owned?"Скин "+skin.name+" теперь надет.":"Ты купил скин "+skin.name+"!");
}
function getCaseItems(){
 return Object.entries({...baseSkins,...caseSkins}).filter(([id,skin])=>!currentUser.ownedSkins.includes(id)&&!skin.limited);
}
function getCaseWeight(id,skin){if(skin.caseOnly)return 2;return 1000/(skin.price+100);}
function getCaseChances(){
 const items=getCaseItems(),total=items.reduce((sum,[id,skin])=>sum+getCaseWeight(id,skin),0);
 if(!total)return {};
 return Object.fromEntries(items.map(([id,skin])=>[id,getCaseWeight(id,skin)/total*100]));
}
function showCaseInfo(){
 const box=caseOdds;box.innerHTML="";const items=getCaseItems(),chances=getCaseChances();
 if(!items.length)box.textContent="Все кейсовые скины уже собраны!";
 else items.forEach(([id,skin])=>{
  const row=document.createElement("div");row.className="oddsRow";
  const n=document.createElement("span");n.textContent=skin.name+(skin.caseOnly?" 🔒":"");
  const p=document.createElement("b");p.textContent=chances[id].toFixed(2)+"%";
  row.append(n,p);box.append(row);
 });
 showOnly("caseInfoScreen");
}
function openCase(){
 if(currentUser.coins<40){alert("❌ Недостаточно монет! Нужно 40 монет.");return;}
 const items=getCaseItems();
 if(!items.length){alert("🏆 Все кейсовые скины уже собраны!");return;}
 currentUser.coins-=40;
 const total=items.reduce((sum,[id,skin])=>sum+getCaseWeight(id,skin),0);
 let r=Math.random()*total,selected=items[items.length-1];
 for(const item of items){r-=getCaseWeight(item[0],item[1]);if(r<=0){selected=item;break;}}
 const [id,skin]=selected;currentUser.ownedSkins.push(id);currentUser.equippedSkin=id;
 saveUser();updateStats();showResult("🎁 ВЫПАЛА ЗМЕЙКА!",skin.name+" теперь твоя и автоматически надета!");
 if(!shopScreen.classList.contains("hidden"))renderSkins();
 if(!caseInfoScreen.classList.contains("hidden"))showCaseInfo();
}
function claimGold(){
 if(currentUser.goldBonusClaimed){alert("Бонус уже получен!");return;}
 currentUser.goldBonusClaimed=true;currentUser.coins+=100;currentUser.xp+=25;
 saveUser();updateStats();showResult("🎉 ЕЖЕДНЕВНЫЙ БОНУС","+100 монет и +25 XP!");
}

/* Промокод million: 1 000 000 монет + админ-тэг, один раз на аккаунт. */
function redeemPromo(){
 const code=promoInput.value.trim().toLowerCase();
 if(!currentUser){promoMessage.textContent="Сначала войди в аккаунт.";return;}
 if(!code){promoMessage.textContent="Введи промокод!";return;}
 if(!Array.isArray(currentUser.redeemedPromos))currentUser.redeemedPromos=[];
 if(code!=="million"){promoMessage.textContent="❌ Неверный промокод!";return;}
 if(currentUser.redeemedPromos.includes(code)){
  if(currentUser.adminPromoClaimed){promoMessage.textContent="⚠️ Промокод уже использован на этом аккаунте.";return;}
  // Старые аккаунты, активировавшие прежнюю версию million, получают новый админ-тэг однократно.
  currentUser.adminPromoClaimed=true;currentUser.tag="admin";currentUser.tagPaidThrough=Date.now();
  saveUser();updateStats();promoInput.value="";
  showResult("👑 АДМИН РАЗБЛОКИРОВАН","Тебе выдан тэг АДМИН. В меню появилась админ-панель.");
  return;
 }
 currentUser.redeemedPromos.push(code);currentUser.adminPromoClaimed=true;
 currentUser.coins+=1000000;currentUser.tag="admin";currentUser.tagPaidThrough=Date.now();
 saveUser();updateStats();promoInput.value="";
 promoMessage.textContent="🎉 Награда получена!";
 showResult("👑 ПРОМОКОД АКТИВИРОВАН","+1 000 000 монет и тэг АДМИН! В меню появилась админ-панель.");
}

/* МУЗЫКА */
function startMenuMusic(){
 if(!musicEnabled)return;
 try{
  if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==="suspended")audioContext.resume();
  if(musicTimer)return;
  const bass=[55,55,73.42,82.41,55,55,98,82.41,65.41,65.41,87.31,98,73.42,73.42,110,98];
  const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,783.99,523.25,783.99,987.77,880,698.46,783.99,1046.5,987.77];
  const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
  let step=0;
  const tone=(freq,type,volume,duration,detune=0)=>{
   const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.detune.setValueAtTime(detune,now);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.02);
  };
  musicTimer=setInterval(()=>{
   if(!musicEnabled||!audioContext)return;
   const i=step%16;tone(bass[i],"sawtooth",.052,.17);tone(bass[i]/2,"sine",.075,.19);
   if(i%4===0){tone(48,"sine",.11,.12);chords[Math.floor(step/16)%chords.length].forEach((f,n)=>tone(f,"triangle",.014,.36,n===1?5:-5));}
   tone(melody[i],"square",.018,.105);if(i%2===1)tone(melody[(i+5)%16]*2,"triangle",.007,.07);step++;
  },110);
 }catch(e){}
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}
function toggleMusic(){
 musicEnabled=!musicEnabled;localStorage.setItem(MUSIC_KEY,String(musicEnabled));
 musicButton.textContent=musicEnabled?"🎵 ВЫКЛЮЧИТЬ МУЗЫКУ":"🔇 ВКЛЮЧИТЬ МУЗЫКУ";
 if(musicEnabled)startMenuMusic();else stopMusic();
}
document.addEventListener("pointerdown",()=>{if(musicEnabled)startMenuMusic();},{passive:true});

/* ИГРА */
const canvas=document.getElementById("gameCanvas"),ctx=canvas.getContext("2d");
let cols=20,rows=20,cellW=20,cellH=20,snake=[],previousSnake=[],food,direction,nextDirection,obstacles=[],enemies=[],bullets=[],chests=[],score=0,wave=1;
let running=false,paused=false,animationId=null,lastStepTime=0,currentSpeed=180,lastEnemySpawn=0,lastChestSpawn=0,lastShot=0,initialEnemyCount=0,pausedAt=0;
const goals=[20,30,40,70];
const scoreEl=document.getElementById("score"),waveEl=document.getElementById("wave");
function resizeCanvas(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);cellW=rect.width/cols;cellH=rect.height/rows;
 if(running)drawGame(1);
}
window.addEventListener("resize",()=>{if(!gameScreen.classList.contains("hidden"))resizeCanvas();});
function randomCell(){return{x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)};}
function same(a,b){return a.x===b.x&&a.y===b.y;}
function occupied(p){return snake.some(s=>same(s,p))||obstacles.some(s=>same(s,p))||enemies.some(s=>same(s,p))||chests.some(s=>same(s,p))||(food&&same(food,p));}
function freeCell(){for(let i=0;i<cols*rows*2;i++){const p=randomCell();if(!occupied(p))return p;}return null;}
function makeFood(){return freeCell()||{x:0,y:0};}
function makeObstacles(){obstacles=[];for(let i=0;i<Math.floor(cols*rows*.018)+wave*2;i++){const p=freeCell();if(p)obstacles.push(p);}}
function spawnEnemy(){const p=freeCell();if(p){enemies.push({x:p.x,y:p.y,hp:4,maxHp:4,moveClock:0,body:[]});initialEnemyCount++;}}
function spawnChest(){const p=freeCell();if(p)chests.push(p);}
function startGame(){
 initialEnemyCount=0;showOnly("gameScreen");resizeCanvas();score=0;wave=1;
 const cx=Math.floor(cols/2),cy=Math.floor(rows/2);
 snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];previousSnake=snake.map(s=>({...s}));
 direction={x:1,y:0};nextDirection={x:1,y:0};obstacles=[];enemies=[];bullets=[];chests=[];food=null;currentSpeed=180;
 makeObstacles();food=makeFood();const now=performance.now();
 lastEnemySpawn=lastChestSpawn=lastShot=now;running=true;paused=false;lastStepTime=now;updateGameUI();
 cancelAnimationFrame(animationId);animationId=requestAnimationFrame(gameFrame);
}
function updateGameUI(){
 scoreEl.textContent=score;waveEl.textContent=wave;gameXP.textContent=currentUser.xp;enemyCount.textContent=enemies.length;
 goalText.textContent=paused?"ПАУЗА":"🔫 Авто-пушка · 👾 враги каждые 20 сек. · 🎁 сундук каждые 30 сек. · Цель: "+(goals[wave-1]||70)+" яблок";
}
function setDirection(x,y){if(!running||paused)return;if(x===-direction.x&&y===-direction.y)return;nextDirection={x,y};}
function pauseGame(){
 if(!running)return;
 if(!paused){paused=true;pausedAt=performance.now();}
 else{paused=false;const elapsed=performance.now()-pausedAt;lastStepTime=performance.now();lastEnemySpawn+=elapsed;lastChestSpawn+=elapsed;lastShot+=elapsed;}
 updateGameUI();drawGame(1);
}
function gameFrame(time){
 if(!running)return;
 if(!paused){
  if(time-lastEnemySpawn>=20000){spawnEnemy();spawnEnemy();lastEnemySpawn=time;}
  if(time-lastChestSpawn>=30000){spawnChest();lastChestSpawn=time;}
  autoShoot();let progress=Math.min(1,(time-lastStepTime)/currentSpeed);
  if(time-lastStepTime>=currentSpeed){stepGame();lastStepTime=time;progress=0;}
  drawGame(progress);
 }
 animationId=requestAnimationFrame(gameFrame);
}
function autoShoot(){
 if(!enemies.length||performance.now()-lastShot<650)return;
 lastShot=performance.now();const head=snake[0];let target=null,best=Infinity;
 enemies.forEach(e=>{const d=Math.abs(e.x-head.x)+Math.abs(e.y-head.y);if(d<best){best=d;target=e;}});
 if(target)bullets.push({x:head.x,y:head.y,target,life:cols+rows});
}
function damageEnemy(e){if(!enemies.includes(e))return;e.hp--;if(e.hp<=0){enemies=enemies.filter(x=>x!==e);currentUser.xp++;currentUser.coins++;}}
function moveBullets(){
 bullets.forEach(b=>{
  if(!enemies.includes(b.target)){b.dead=true;return;}
  const dx=b.target.x-b.x,dy=b.target.y-b.y;
  if(Math.abs(dx)>=Math.abs(dy)&&dx)b.x+=Math.sign(dx);else if(dy)b.y+=Math.sign(dy);
  else{damageEnemy(b.target);b.dead=true;return;}
  b.life--;if(b.life<=0)b.dead=true;
  if(b.x===b.target.x&&b.y===b.target.y){damageEnemy(b.target);b.dead=true;}
 });
 bullets=bullets.filter(b=>!b.dead);
}
function collectChest(){
 const i=chests.findIndex(c=>same(c,snake[0]));if(i<0)return;chests.splice(i,1);
 if(Math.random()<.25){
  const existing=new Set((currentUser.bonusSkins||[]).map(s=>s.color));
  const available=BONUS_COLORS.filter(c=>!existing.has(c)&&!Object.values(baseSkins).some(s=>s.color===c));
  if(available.length){
   const color=available[Math.floor(Math.random()*available.length)],id="bonus_"+color.slice(1);
   currentUser.bonusSkins.push({id,name:"Бонусный цвет",color});currentUser.ownedSkins.push(id);currentUser.equippedSkin=id;
   alert("🎨 Открыт новый бонусный цвет!");
  }else{currentUser.coins+=25;alert("🎁 +25 монет");}
 }else{const coins=20+Math.floor(Math.random()*21);currentUser.coins+=coins;alert("🎁 СУНДУК! +"+coins+" монет");}
 saveUser();updateStats();
}
function stepGame(){
 previousSnake=snake.map(s=>({...s}));direction=nextDirection;
 const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
 if(head.x<0||head.x>=cols||head.y<0||head.y>=rows){endGame(false);return;}
 if(snake.some((s,i)=>i>0&&same(s,head))||obstacles.some(o=>same(o,head))||enemies.some(e=>same(e,head))){endGame(false);return;}
 snake.unshift(head);
 if(same(head,food)){
  score++;currentUser.xp+=2;currentUser.coins+=3;food=makeFood();
  const goal=goals[wave-1]||70;
  if(score>=goal){
   if(wave>=4){endGame(true);return;}
   wave++;score=0;currentUser.xp+=20;currentUser.coins+=20;currentSpeed=Math.max(95,currentSpeed-15);makeObstacles();food=makeFood();
  }
 }else snake.pop();
 collectChest();moveEnemies();moveBullets();updateGameUI();if(score%5===0)saveUser();
}
function moveEnemies(){
 const head=snake[0];
 if(enemies.some(e=>Math.abs(e.x-head.x)+Math.abs(e.y-head.y)<=1)){endGame(false);return;}
 enemies.forEach(e=>{
  e.moveClock++;if(e.moveClock<4)return;e.moveClock=0;
  const options=[{x:e.x+1,y:e.y},{x:e.x-1,y:e.y},{x:e.x,y:e.y+1},{x:e.x,y:e.y-1}]
   .filter(p=>p.x>=0&&p.x<cols&&p.y>=0&&p.y<rows&&!obstacles.some(o=>same(o,p))&&!snake.some(s=>same(s,p))&&!enemies.some(other=>other!==e&&same(other,p)));
  if(!options.length)return;
  options.sort((a,b)=>(Math.abs(a.x-head.x)+Math.abs(a.y-head.y))-(Math.abs(b.x-head.x)+Math.abs(b.y-head.y)));
  const p=Math.random()<.75?options[0]:options[Math.floor(Math.random()*options.length)];
  e.body.unshift({x:e.x,y:e.y});e.body=e.body.slice(0,2);e.x=p.x;e.y=p.y;
 });
 if(running&&enemies.some(e=>Math.abs(e.x-snake[0].x)+Math.abs(e.y-snake[0].y)<=1))endGame(false);
}
function drawGame(progress=1){
 const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#0a1a12";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="#183a29";ctx.lineWidth=.7;
 for(let i=0;i<=cols;i++){ctx.beginPath();ctx.moveTo(i*cellW,0);ctx.lineTo(i*cellW,h);ctx.stroke();}
 for(let i=0;i<=rows;i++){ctx.beginPath();ctx.moveTo(0,i*cellH);ctx.lineTo(w,i*cellH);ctx.stroke();}
 obstacles.forEach(o=>{ctx.fillStyle="#858b91";ctx.fillRect(o.x*cellW+2,o.y*cellH+2,cellW-4,cellH-4);});
 chests.forEach(c=>{
  const x=c.x*cellW,y=c.y*cellH;ctx.fillStyle="#a85d18";ctx.fillRect(x+3,y+6,cellW-6,cellH-9);
  ctx.fillStyle="#ffc247";ctx.fillRect(x+3,y+5,cellW-6,cellH*.25);
  ctx.fillStyle="#fff0a0";ctx.fillRect(x+cellW*.43,y+cellH*.28,cellW*.14,cellH*.42);
 });
 enemies.forEach(e=>{
  (e.body||[]).forEach(p=>{ctx.fillStyle="#a32b42";ctx.beginPath();ctx.arc((p.x+.5)*cellW,(p.y+.5)*cellH,cellW*.27,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle="#ff4c61";ctx.beginPath();ctx.arc((e.x+.5)*cellW,(e.y+.5)*cellH,cellW*.36,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="white";ctx.fillRect(e.x*cellW+cellW*.25,e.y*cellH+cellH*.3,3,3);ctx.fillRect(e.x*cellW+cellW*.62,e.y*cellH+cellH*.3,3,3);
  const bw=cellW*.7,bx=e.x*cellW+cellW*.15,by=e.y*cellH+2;ctx.fillStyle="#35121a";ctx.fillRect(bx,by,bw,3);ctx.fillStyle="#7dff8d";ctx.fillRect(bx,by,bw*e.hp/e.maxHp,3);
 });
 bullets.forEach(b=>{ctx.fillStyle="#7afaff";ctx.beginPath();ctx.arc((b.x+.5)*cellW,(b.y+.5)*cellH,Math.max(3,cellW*.16),0,Math.PI*2);ctx.fill();});
 ctx.fillStyle="#ff4141";ctx.beginPath();ctx.arc((food.x+.5)*cellW,(food.y+.5)*cellH,cellW*.38,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#7dff8d";ctx.fillRect(food.x*cellW+cellW*.44,food.y*cellH+1,3,5);
 drawSnake(progress);
 if(paused){ctx.fillStyle="#0009";ctx.fillRect(0,0,w,h);ctx.fillStyle="white";ctx.font="bold 34px Arial";ctx.textAlign="center";ctx.fillText("ПАУЗА",w/2,h/2);}
}
function drawSnake(progress){
 const skin=getSkins()[currentUser.equippedSkin]||baseSkins.default;
 snake.forEach((p,i)=>{
  const old=previousSnake[i]||p;let dx=p.x-old.x,dy=p.y-old.y;
  if(Math.abs(dx)>1)dx=0;if(Math.abs(dy)>1)dy=0;
  const x=(old.x+dx*progress)*cellW,y=(old.y+dy*progress)*cellH;
  if(skin.color==="kitsune" && i===snake.length-1){
   const before=snake[i-1]||p;
   let tx=p.x-before.x,ty=p.y-before.y;
   if(Math.abs(tx)>1)tx=0;if(Math.abs(ty)>1)ty=0;
   if(tx===0&&ty===0){tx=-1;ty=0;}
   const len=Math.hypot(tx,ty)||1;tx/=len;ty/=len;
   const sway=Math.sin(Date.now()/210)*cellW*.22;
   const baseX=x+cellW*.5+tx*cellW*.20,baseY=y+cellH*.5+ty*cellH*.20;
   const tipX=baseX+tx*cellW*1.35-ty*sway,tipY=baseY+ty*cellH*1.35+tx*sway;
   ctx.save();ctx.shadowColor="#42dfff";ctx.shadowBlur=15;
   const plume=ctx.createLinearGradient(baseX,baseY,tipX,tipY);
   plume.addColorStop(0,"#e8ffff");plume.addColorStop(.45,"#54dfff");plume.addColorStop(1,"#a58bff");
   ctx.fillStyle=plume;ctx.strokeStyle="#d9ffff";ctx.lineWidth=cellW*.16;ctx.lineCap="round";
   ctx.beginPath();
   ctx.moveTo(baseX-ty*cellW*.17,baseY+tx*cellH*.17);
   ctx.quadraticCurveTo(tipX-ty*cellW*.42,tipY+tx*cellH*.42,tipX,tipY);
   ctx.quadraticCurveTo(tipX+ty*cellW*.42,tipY-tx*cellH*.42,baseX+ty*cellW*.17,baseY-tx*cellH*.17);
   ctx.quadraticCurveTo(baseX+tx*cellW*.22,baseY+ty*cellH*.22,baseX-ty*cellW*.17,baseY+tx*cellH*.17);
   ctx.closePath();ctx.fill();
   // Мягкие пушистые пряди по краям хвоста.
   for(let f=-2;f<=2;f++){
    ctx.beginPath();
    ctx.moveTo(baseX-ty*f*cellW*.045,baseY+tx*f*cellH*.045);
    ctx.quadraticCurveTo(tipX-tx*cellW*.35-ty*f*cellW*.10,tipY-ty*cellH*.15+tx*f*cellH*.10,tipX+ty*f*cellW*.09,tipY-tx*f*cellH*.09);
    ctx.stroke();
   }
   ctx.restore();
  }
  if(skin.color==="kitsune"){
   const gradient=ctx.createLinearGradient(x,y,x+cellW,y+cellH);
   gradient.addColorStop(0,"#e4ffff");gradient.addColorStop(.35,"#00dfff");gradient.addColorStop(.7,"#3976ff");gradient.addColorStop(1,"#d69aff");
   ctx.fillStyle=gradient;
   if(i===0){
    // Большие заметные лисьи ушки с розово-голубой внутренней частью.
    ctx.save();
    ctx.shadowColor="#4deaff";ctx.shadowBlur=14;
    const earW=cellW*.34, earH=cellH*.62;
    ctx.fillStyle="#9defff";
    ctx.beginPath();
    ctx.moveTo(x+cellW*.12,y+cellH*.28);
    ctx.quadraticCurveTo(x+cellW*.10,y-cellH*.30,x+cellW*.43,y-cellH*.48);
    ctx.quadraticCurveTo(x+cellW*.48,y-cellH*.08,x+cellW*.49,y+cellH*.20);
    ctx.closePath();ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+cellW*.53,y+cellH*.20);
    ctx.quadraticCurveTo(x+cellW*.60,y-cellH*.10,x+cellW*.87,y-cellH*.48);
    ctx.quadraticCurveTo(x+cellW*.92,y-cellH*.12,x+cellW*.87,y+cellH*.29);
    ctx.closePath();ctx.fill();
    ctx.fillStyle="#ffb6e8";
    ctx.beginPath();ctx.moveTo(x+cellW*.23,y+cellH*.12);ctx.lineTo(x+cellW*.29,y-cellH*.29);ctx.lineTo(x+cellW*.40,y+cellH*.13);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+cellW*.65,y+cellH*.13);ctx.lineTo(x+cellW*.82,y-cellH*.29);ctx.lineTo(x+cellW*.78,y+cellH*.16);ctx.closePath();ctx.fill();
    ctx.restore();
   }
  }else{
   ctx.fillStyle=skin.color==="rainbow"?`hsl(${(i*25+Date.now()/20)%360},90%,60%)`:skin.color;
  }
  ctx.beginPath();ctx.roundRect(x+1,y+1,cellW-2,cellH-2,Math.min(8,cellW*.25));ctx.fill();
  if(i===0){
   ctx.fillStyle="#092016";ctx.fillRect(x+cellW*.65,y+cellH*.25,4,4);ctx.fillRect(x+cellW*.65,y+cellH*.62,4,4);
  }
 });
}
function endGame(won){
 running=false;cancelAnimationFrame(animationId);saveUser();updateStats();showOnly("gameOverScreen");
 endTitle.textContent=won?"🏆 ПОБЕДА!":"ИГРА ОКОНЧЕНА";
 endText.textContent=won?"Ты прошёл все 4 волны! Награда: 100 монет и 100 XP.":"Собрано яблок: "+score+". Волна: "+wave+". Уничтожено врагов: "+(initialEnemyCount-enemies.length)+".";
 if(won){currentUser.coins+=100;currentUser.xp+=100;saveUser();updateStats();}
}
function backToMenu(){running=false;cancelAnimationFrame(animationId);saveUser();updateStats();showOnly("menuScreen");}

/* УПРАВЛЕНИЕ */
let touchStartX=0,touchStartY=0;
canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];touchStartX=t.clientX;touchStartY=t.clientY;},{passive:true});
canvas.addEventListener("touchend",e=>{
 const t=e.changedTouches[0],dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;
 if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;
 if(Math.abs(dx)>Math.abs(dy))setDirection(dx>0?1:-1,0);else setDirection(0,dy>0?1:-1);
},{passive:true});
document.addEventListener("keydown",e=>{
 const k={ArrowUp:[0,-1],w:[0,-1],ц:[0,-1],ArrowDown:[0,1],s:[0,1],ы:[0,1],ArrowLeft:[-1,0],a:[-1,0],ф:[-1,0],ArrowRight:[1,0],d:[1,0],в:[1,0]};
 if(k[e.key]){e.preventDefault();setDirection(...k[e.key]);}
 if(e.key===" "&&running){e.preventDefault();pauseGame();}
});

function initializeApp(){
 musicButton.textContent=musicEnabled?"🎵 ВЫКЛЮЧИТЬ МУЗЫКУ":"🔇 ВКЛЮЧИТЬ МУЗЫКУ";
 setTimeout(()=>{
  const saved=localStorage.getItem(SESSION_KEY);
  if(saved&&accounts[saved]){currentUser=accounts[saved];normalizeUser(currentUser);saveUser();enterGame();}
  else{currentUser=null;localStorage.removeItem(SESSION_KEY);showOnly("loginScreen");}
 },1200);
}
initializeApp();
