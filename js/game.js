var player;
var needCanvasUpdate = true;
var gameEnded = false;
var devSpeed = false;
var easyChallenges = false;
var softcaps = {
	b:[new Decimal(20), new Decimal(35), new Decimal(50), new Decimal(65), new Decimal(75), new Decimal(85), new Decimal(100), new Decimal(150), new Decimal(200), new Decimal(220), new Decimal(250), new Decimal(300), new Decimal(320), new Decimal(365), new Decimal(399), new Decimal(400), new Decimal(425), new Decimal(450), new Decimal(470), new Decimal(500), new Decimal(600), new Decimal(700), new Decimal(800), new Decimal(900), new Decimal(1000), new Decimal(2000), new Decimal(2500), new Decimal(2800), new Decimal(3000)],
	c:[new Decimal(10), new Decimal(15), new Decimal(20), new Decimal(25), new Decimal(30), new Decimal(35), new Decimal(60), new Decimal(70), new Decimal(85), new Decimal(100)],
	n:[new Decimal(5), new Decimal(10), new Decimal(11), new Decimal(15), new Decimal(20), new Decimal(25), new Decimal(30), new Decimal(40), new Decimal(50)],
};

// Don't change this
const TMT_VERSION = {
	tmtNum: "2.π.1",
	tmtName: "Incrementally Updated"
}

function getResetGain(layer, useType = null) {
	let type = useType
	if (!useType){ 
		type = tmp[layer].type
		if (layers[layer].getResetGain !== undefined)
			return layers[layer].getResetGain()
	} 
	if(tmp[layer].type == "none")
		return new Decimal (0)
	if (tmp[layer].gainExp.eq(0)) return new Decimal(0)
	if (type=="static") {
		if ((!tmp[layer].canBuyMax) || tmp[layer].baseAmount.lt(tmp[layer].requires)) return new Decimal(1)
		let gain = tmp[layer].baseAmount.div(tmp[layer].requires).div(tmp[layer].gainMult).max(1).log(tmp[layer].base).times(tmp[layer].gainExp).pow(Decimal.pow(tmp[layer].exponent, -1))
		return gain.floor().sub(player[layer].points).add(1).max(1);
	} else if (type=="normal"){
		if (tmp[layer].baseAmount.lt(tmp[layer].requires)) return new Decimal(0)
		let gain = tmp[layer].baseAmount.div(tmp[layer].requires).pow(tmp[layer].exponent).times(tmp[layer].gainMult).pow(tmp[layer].gainExp)
		if (gain.gte(tmp[layer].softcap)) gain = gain.pow(tmp[layer].softcapPower).times(tmp[layer].softcap.pow(decimalOne.sub(tmp[layer].softcapPower)))
		return gain.floor().max(0);
	} else {
		return new Decimal(0)
	}
}

function getNextAt(layer, canMax=false, useType = null) {
	let type = useType
	if (!useType) {
		type = tmp[layer].type
		if (layers[layer].getNextAt !== undefined)
			return layers[layer].getNextAt(canMax)

		}
	if(tmp[layer].type == "none")
		return new Decimal (Infinity)

	if (tmp[layer].gainMult.lte(0)) return new Decimal(Infinity)
	if (tmp[layer].gainExp.lte(0)) return new Decimal(Infinity)

	if (type=="static") 
	{
		if (!tmp[layer].canBuyMax) canMax = false
		let amt = player[layer].points.plus((canMax&&tmp[layer].baseAmount.gte(tmp[layer].nextAt))?tmp[layer].resetGain:0)
		let extraCost = Decimal.pow(tmp[layer].base, amt.pow(tmp[layer].exponent).div(tmp[layer].gainExp)).times(tmp[layer].gainMult)
		let cost = extraCost.times(tmp[layer].requires).max(tmp[layer].requires)
		if (tmp[layer].roundUpCost) cost = cost.ceil()
		return cost;
	} else if (type=="normal"){
		let next = tmp[layer].resetGain.add(1)
		if (next.gte(tmp[layer].softcap)) next = next.div(tmp[layer].softcap.pow(decimalOne.sub(tmp[layer].softcapPower))).pow(decimalOne.div(tmp[layer].softcapPower))
		next = next.root(tmp[layer].gainExp).div(tmp[layer].gainMult).root(tmp[layer].exponent).times(tmp[layer].requires).max(tmp[layer].requires)
		if (tmp[layer].roundUpCost) next = next.ceil()
		return next;
	} else {
		return new Decimal(0)
	}
}

function softcap(value, cap, power = 0.5) {
	if (value.lte(cap)) return value
	else
		return value.pow(power).times(cap.pow(decimalOne.sub(power)))
}

// Return true if the layer should be highlighted. By default checks for upgrades only.
function shouldNotify(layer){
	if (player.tab == layer || player.navTab == layer) return false
	for (id in tmp[layer].upgrades){
		if (!isNaN(id)){
			if (canAffordUpgrade(layer, id) && !hasUpgrade(layer, id) && tmp[layer].upgrades[id].unlocked){
				return true
			}
		}
	}
	if (player[layer].activeChallenge && canCompleteChallenge(layer, player[layer].activeChallenge)) {
		return true
	}

	if (isPlainObject(tmp[layer].tabFormat)) {
		for (subtab in tmp[layer].tabFormat){
			if (subtabShouldNotify(layer, 'mainTabs', subtab))
				return true
		}
	}

	for (family in tmp[layer].microtabs) {
		for (subtab in tmp[layer].microtabs[family]){
			if (subtabShouldNotify(layer, family, subtab))
				return true
		}
	}
	if (tmp[layer].shouldNotify){
		return tmp[layer].shouldNotify
	}
	else 
		return false
}

function canReset(layer)
{	
	if (layers[layer].canReset!== undefined)
		return run(layers[layer].canReset, layers[layer])
	else if(tmp[layer].type == "normal")
		return tmp[layer].baseAmount.gte(tmp[layer].requires)
	else if(tmp[layer].type== "static")
		return tmp[layer].baseAmount.gte(tmp[layer].nextAt)
	else 
		return false
}

function rowReset(row, layer) {
	for (lr in ROW_LAYERS[row]){
		if(layers[lr].doReset) {
			run(layers[lr].doReset, layers[lr], layer)
		}
		else
			if(tmp[layer].row > tmp[lr].row && row !== "side" && !isNaN(row)) layerDataReset(lr)
	}
}

function layerDataReset(layer, keep = []) {
	let storedData = {unlocked: player[layer].unlocked} // Always keep unlocked

	for (thing in keep) {
		if (player[layer][keep[thing]] !== undefined)
			storedData[keep[thing]] = player[layer][keep[thing]]
	}
	Vue.set(player[layer], "buyables", getStartBuyables(layer))
	Vue.set(player[layer], "clickables", getStartClickables(layer))
	Vue.set(player[layer], "challenges", getStartChallenges(layer))

	layOver(player[layer], getStartLayerData(layer))
	player[layer].upgrades = []
	player[layer].milestones = []
	player[layer].achievements = []
	player[layer].challenges = getStartChallenges(layer)
	resetBuyables(layer)

	if (layers[layer].clickables && !player[layer].clickables) 
		player[layer].clickables = getStartClickables(layer)
	for (thing in storedData) {
		player[layer][thing] =storedData[thing]
	}
}

function resetBuyables(layer){
	if (layers[layer].buyables) 
		player[layer].buyables = getStartBuyables(layer)
	player[layer].spentOnBuyables = new Decimal(0)
}


function addPoints(layer, gain) {
	if(layer == "b") {
		for(i = 0;i < softcaps.b.length;i++) {
			if(player[layer].points.lt(softcaps.b[i]) && player[layer].points.add(gain).gt(softcaps.b[i])) {
				gain = softcaps.b[i].minus(player[layer].points)
			}
		}
	}
	if(layer == "c") {
		for(i = 0;i < softcaps.c.length;i++) {
			if(player[layer].points.lt(softcaps.c[i]) && player[layer].points.add(gain).gt(softcaps.c[i])) {
				gain = softcaps.c[i].minus(player[layer].points)
			}
		}
	}
	if(layer == "n") {
		for(i = 0;i < softcaps.n.length;i++) {
			if(player[layer].points.lt(softcaps.n[i]) && player[layer].points.add(gain).gt(softcaps.n[i])) {
				gain = softcaps.n[i].minus(player[layer].points)
			}
		}
	}
	player[layer].points = player[layer].points.add(gain).max(0)
	if (player[layer].best) player[layer].best = player[layer].best.max(player[layer].points)
	if (player[layer].total) player[layer].total = player[layer].total.add(gain)
}

function generatePoints(layer, diff) {
	addPoints(layer, tmp[layer].resetGain.times(diff))
}

var prevOnReset

function doReset(layer, force=false) {
	if (tmp[layer].type == "none") return
	let row = tmp[layer].row
	if (!force) {
		if (tmp[layer].baseAmount.lt(tmp[layer].requires)) return;
		let gain = tmp[layer].resetGain
		if (tmp[layer].type=="static") {
			if (tmp[layer].baseAmount.lt(tmp[layer].nextAt)) return;
			gain =(tmp[layer].canBuyMax ? gain : 1)
		} 
		if (tmp[layer].type=="custom") {
			if (!tmp[layer].canReset) return;
		} 

		if (layers[layer].onPrestige)
			run(layers[layer].onPrestige, layers[layer], gain)
		
		addPoints(layer, gain)
		updateMilestones(layer)
		updateAchievements(layer)

		if (!player[layer].unlocked) {
			player[layer].unlocked = true;
			needCanvasUpdate = true;

			if (tmp[layer].increaseUnlockOrder){
				lrs = tmp[layer].increaseUnlockOrder
				for (lr in lrs)
					if (!player[lrs[lr]].unlocked) player[lrs[lr]].unlockOrder++
			}
		}
	
		tmp[layer].baseAmount = new Decimal(0) // quick fix
	}

	if (tmp[layer].resetsNothing) return

	prevOnReset = {...player} //Deep Copy
	player.points = (row == 0 ? new Decimal(0) : getStartPoints())

	for (let x = row; x >= 0; x--) rowReset(x, layer)
	rowReset("side", layer)
	prevOnReset = undefined

	player[layer].resetTime = 0

	updateTemp()
	updateTemp()
}

function resetRow(row) {
	if (prompt('Are you sure you want to reset this row? It is highly recommended that you wait until the end of your current run before doing this! Type "I WANT TO RESET THIS" to confirm')!="I WANT TO RESET THIS") return
	let pre_layers = ROW_LAYERS[row-1]
	let layers = ROW_LAYERS[row]
	let post_layers = ROW_LAYERS[row+1]
	rowReset(row+1, post_layers[0])
	doReset(pre_layers[0], true)
	for (let layer in layers) {
		player[layer].unlocked = false
		if (player[layer].unlockOrder) player[layer].unlockOrder = 0
	}
	player.points = getStartPoints()
	updateTemp();
	resizeCanvas();
}

function startChallenge(layer, x) {
	if(layer == "n") {
		keep = []
		if(x == 21) {
			player.n.resetTime = 0
			keep.push("milestones")
		}
		layerDataReset("c", keep)
		layerDataReset("w")
		layerDataReset("b")
		layerDataReset("m")
		player.points = new Decimal(0)
		if(easyChallenges) {
			player.c.milestones = ["0", "1", "2", "3"]
			player.w.milestones = ["0", "1"]
			player.b.milestones = ["0", "1", "2"]
		}
	}
	if(layer == "s") {
		layerDataReset("n")
		layerDataReset("c")
		layerDataReset("w")
		layerDataReset("b")
		layerDataReset("m")
		player.points = new Decimal(0)
		if(x == 12) {
			layerDataReset("p")
			layerDataReset("g")
		}
		if(easyChallenges) {
			player.n.milestones = ["0", "1"]
			player.c.milestones = ["0", "1", "2", "3"]
			player.w.milestones = ["0", "1"]
			player.b.milestones = ["0", "1", "2"]
		}
	}
	let enter = false
	if (!player[layer].unlocked) return
	if (player[layer].activeChallenge == x) {
		completeChallenge(layer, x)
		player[layer].activeChallenge = null
	} else {
		enter = true
	}	
	doReset(layer, true)
	if(enter) player[layer].activeChallenge = x

	updateChallengeTemp(layer)
}

function canCompleteChallenge(layer, x)
{
	if (x != player[layer].activeChallenge) return
	let challenge = tmp[layer].challenges[x]
	if (challenge.canComplete !== undefined) return challenge.canComplete

	if (challenge.currencyInternalName){
		let name = challenge.currencyInternalName
		if (challenge.currencyLocation){
			return !(challenge.currencyLocation[name].lt(challenge.goal)) 
		}
		else if (challenge.currencyLayer){
			let lr = challenge.currencyLayer
			return !(player[lr][name].lt(challenge.goal)) 
		}
		else {
			return !(player[name].lt(challenge.goal))
		}
	}
	else {
		return !(player.points.lt(challenge.goal))
	}

}

function completeChallenge(layer, x) {
	var x = player[layer].activeChallenge
	if (!x) return
	if (! canCompleteChallenge(layer, x)){
		player[layer].activeChallenge = null
		if(layer == "n") {
			player.c.best = new Decimal(10).max(player.c.best)
		}
		if(layer == "s") {
			player.c.best = new Decimal(10).max(player.c.best)
			player.n.best = new Decimal(10).max(player.n.best)
			if(x == 12) {
				player.c.upgrades = ["24"]
			}
		}
		return
	}
	if (player[layer].challenges[x] < tmp[layer].challenges[x].completionLimit) {
		needCanvasUpdate = true
		player[layer].challenges[x] += 1
		if (layers[layer].challenges[x].onComplete) run(layers[layer].challenges[x].onComplete, layers[layer].challenges[x])
	}
	player[layer].activeChallenge = null
	updateChallengeTemp(layer)
}

VERSION.withoutName = "v" + VERSION.num + (VERSION.pre ? " Pre-Release " + VERSION.pre : VERSION.pre ? " Beta " + VERSION.beta : "")
VERSION.withName = VERSION.withoutName + (VERSION.name ? ": " + VERSION.name : "")


function autobuyUpgrades(layer){
	if (!tmp[layer].upgrades) return
	for (id in tmp[layer].upgrades)
		if (isPlainObject(tmp[layer].upgrades[id]) && (layers[layer].upgrades[id].canAfford === undefined || layers[layer].upgrades[id].canAfford() === true))
			buyUpg(layer, id) 
}

function gameLoop(diff) {
	if (isEndgame() || gameEnded) gameEnded = 1

	if (isNaN(diff)) diff = 0
	if (gameEnded && !player.keepGoing) {
		diff = 0
		player.tab = "gameEnded"
	}
	if (devSpeed) diff *= devSpeed

	if (maxTickLength) {
		let limit = maxTickLength()
		if(diff > limit)
			diff = limit
	}
	addTime(diff)
	player.points = player.points.add(tmp.pointGen.times(diff)).max(0)
	if(hasUpgrade("s", 15) || player.i.points.gt(1)) addPoints("i", player.i.points.times(tmp.i.effect.add(1).pow(diff).minus(1)))
	if(hasUpgrade("i", 13)) player.p.points = player.p.points.times(new Decimal(0.99).pow(diff))

	for (x = 0; x <= maxRow; x++){
		for (item in TREE_LAYERS[x]) {
			let layer = TREE_LAYERS[x][item]
			player[layer].resetTime += diff
			if (tmp[layer].passiveGeneration) generatePoints(layer, diff*tmp[layer].passiveGeneration);
			if (layers[layer].update) layers[layer].update(diff);
		}
	}

	for (row in OTHER_LAYERS){
		for (item in OTHER_LAYERS[row]) {
			let layer = OTHER_LAYERS[row][item]
			player[layer].resetTime += diff
			if (tmp[layer].passiveGeneration) generatePoints(layer, diff*tmp[layer].passiveGeneration);
			if (layers[layer].update) layers[layer].update(diff);
		}
	}	

	for (x = maxRow; x >= 0; x--){
		for (item in TREE_LAYERS[x]) {
			let layer = TREE_LAYERS[x][item]
			if (tmp[layer].autoPrestige && tmp[layer].canReset) doReset(layer);
			if (layers[layer].automate) layers[layer].automate();
			if (layers[layer].autoUpgrade) autobuyUpgrades(layer)
		}
	}

	for (row in OTHER_LAYERS){
		for (item in OTHER_LAYERS[row]) {
			let layer = OTHER_LAYERS[row][item]
			if (tmp[layer].autoPrestige && tmp[layer].canReset) doReset(layer);
			if (layers[layer].automate) layers[layer].automate();
			if (layers[layer].autoUpgrade) autobuyUpgrades(layer)
		}
	}

	for (layer in layers){
		if (layers[layer].milestones) updateMilestones(layer);
		if (layers[layer].achievements) updateAchievements(layer)
	}

}

function hardReset() {
	if (!confirm("Are you sure you want to do this? You will lose all your progress!")) return
	player = null
	save();
	window.location.reload();
}

var ticking = false

var interval = setInterval(function() {
	if (player===undefined||tmp===undefined) return;
	if (ticking) return;
	if (gameEnded&&!player.keepGoing) return;
	ticking = true
	let now = Date.now()
	let diff = (now - player.time) / 1e3
	if (player.offTime !== undefined) {
		if (player.offTime.remain > modInfo.offlineLimit * 3600) player.offTime.remain = modInfo.offlineLimit * 3600
		if (player.offTime.remain > 0) {
			let offlineDiff = Math.max(player.offTime.remain / 10, diff)
			player.offTime.remain -= offlineDiff
			diff += offlineDiff
		}
		if (!player.offlineProd || player.offTime.remain <= 0) player.offTime = undefined
	}
	player.time = now
	if (needCanvasUpdate){ resizeCanvas();
		needCanvasUpdate = false;
	}
	updateTemp();
	gameLoop(diff)
	fixNaNs()
	adjustPopupTime(diff) 
	ticking = false
}, 50)

setInterval(function() {needCanvasUpdate = true}, 500)

function toggleEasyChallenges() {
	if(easyChallenges) easyChallenges = false
	else easyChallenges = true
}

function buyAll(layer) {
	for(i = 0;i < tmp[layer].upgrades.cols*tmp[layer].upgrades.rows;i++) {
		j = i
		k = 0
		while(j > 4) {
			j = j-5
			k = k+1
		}
		j = k*10+j+11
		buyUpgrade(layer, j)
	}
}

function buyAllBuyables(layer) {
	for(i = 0;i < tmp[layer].buyables.cols*tmp[layer].buyables.rows;i++) {
		j = i
		k = 0
		while(j > 2) {
			j = j-3
			k = k+1
		}
		j = k*10+j+11
		for(l = 0;l < 100;l++) {
			buyBuyable(layer, j)
		}
	}
}