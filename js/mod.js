let modInfo = {
	name: "The Electric Tree",
	id: "TETBB",
	author: "mathnerdfromfrance",
	pointsName: "KWh",
	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal(0), // Used for hard resets and new players
	offlineLimit: 0,  // In hours
}

// Set your version in num and name
let VERSION = {
	num: "0.10",
	name: "Sun"
}

let changelog = `<h1>Changelog:</h1><br>
    <br><h3>v0.10 : Sun ( April 22nd )</h3><br>
    <br><h3>v0.9 : Corrupted Save ( I hope not ) ( April 7th )</h3><br>
    <br><h3>v0.8 : Corruption ( April 6th )</h3><br>
    <br><h3>v0.7.5 : Nuclear Hell Bug Fix ( April 6th )</h3><br>
    <br><h3>v0.7 : Nuclear Hell ( April 5th )</h3><br>
    <br><h3>v0.6 : Radioactive ( April 5th )</h3><br>
    <br><h3>v0.5 : Pollution ( April 4th )</h3><br>
    <br><h3>v0.4 : More Work ( April 2nd )</h3><br>
    <br><h3>v0.3 : Start Working ( April 2nd )</h3><br>
    <br><h3>v0.2.1 : Discord Fix ( April 1st )</h3><br>
    <br><h3>v0.2 : Storing Electricity ( April 1st )</h3><br>
	<br><h3>v0.1 : The Begenning ( March 31st )</h3><br>`

let winText = `Congratulations! That amount of electricity just broke the universe!<br>
               Unfortunately, this is the end of the game...for now`

// If you add new functions anywhere inside of a layer, and those functions have an effect when called, add them here.
// (The ones here are examples, all official functions are already taken care of)
var doNotCallTheseFunctionsEveryTick = ["blowUpEverything"]

function getStartPoints(){
    return new Decimal(modInfo.initialStartPoints)
}

// Determines if it should show points/sec
function canGenPoints(){
	return true
}

// Calculate points/sec!
function getPointGen() {
	if(!canGenPoints())
		return new Decimal(0)

	let gain = new Decimal(1)
	if(hasUpgrade("m", 11)) {gain = gain.times(tmp.m.upgrades[11].effect)}
	if(hasUpgrade("m", 12)) {gain = gain.times(tmp.m.upgrades[12].effect)}
	if(hasUpgrade("m", 13)) {gain = gain.times(tmp.m.upgrades[13].effect)}
	if(hasUpgrade("m", 14)) {gain = gain.times(tmp.m.upgrades[14].effect)}
	if(hasUpgrade("m", 55)) {gain = gain.times(new Decimal("1e2000"))}
	if(hasUpgrade("w", 11)) {gain = gain.times(tmp.w.upgrades[11].effect)}
	if(hasChallenge("w", 11)) {gain = gain.times(tmp.w.challenges[11].rewardEffect)}
	if(hasChallenge("n", 21)) {gain = gain.times(tmp.n.challenges[21].rewardEffect)}
	gain = gain.times(tmp.m.buyables[11].effect)
	gain = gain.times(tmp.m.effect)
	gain = gain.times(tmp.b.effect)
	gain = gain.times(tmp.w.effect)
	gain = gain.times(tmp.c.effect.pow(100))
	gain = gain.times(tmp.n.effect.pow(1000))
	gain = gain.times(tmp.s.effect)
	if(inChallenge("w", 22)) {
		gain = gain.times(tmp.m.buyables[12].effect)
		gain = gain.pow(0.001)
	}
	if(inChallenge("n", 11)) {
		gain = gain.div(new Decimal(1000).pow(player.m.upgrades.length))
		gain = gain.div(new Decimal(10000).pow(player.b.upgrades.length))
		gain = gain.div(new Decimal(100000).pow(player.w.upgrades.length))
		gain = gain.div(new Decimal(1000000).pow(player.c.upgrades.length))
	}
	if(inChallenge("n", 21)) {
		gain = gain.div(new Decimal(10).pow(100).pow(player.n.resetTime/1000))
	}
	if(inChallenge("s", 12)) {
		if(getBuyableAmount("p", 11).eq(1)) gain = gain.pow(1.25)
	}
	if(maxedChallenge("s", 12)) gain = gain.pow(1.05)
	if(hasUpgrade("i", 22)) gain = gain.pow(1.001)
	gain = gain.pow(tmp.p.effect)
	return gain
}

// You can add non-layer related variables that should to into "player" and be saved here, along with default values
function addedPlayerData() { return {
}}

// Display extra things at the top of the page
var displayThings = [
]

// Determines when the game "ends"
function isEndgame() {
	return hasUpgrade("m", 65)
}



// Less important things beyond this point!

// You can change this if you have things that can be messed up by long tick lengths
function maxTickLength() {
	return(3600) // Default is 1 hour which is just arbitrarily large
}

// Use this if you need to undo inflation from an older version. If the version is older than the version that fixed the issue,
// you can cap their current resources with this.
function fixOldSave(oldVersion){
}