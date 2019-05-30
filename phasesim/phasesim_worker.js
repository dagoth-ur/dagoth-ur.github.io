(function () {
    "use strict";

    // Doesn't exactly simulate graze, edge and individual
    // rolls but uses avg. calculated dmg passed from caller.
    // Returns { victory (bool), livesBough (num), focusesBought (num) }
    function ripAndTear(simStats) { 
        const {atksPerFocus, freeAtkChance, livesPerDeath
              ,dodgeChance} = simStats; 
        var {lives, buyableLives, phaseHp, offRomanceAvailable} = simStats;
        var dmgPerSwing = simStats.ddDmg;
        var deathChance = simStats.ddDC / 100;
        var livesBought = 0;
        var focusesBought = 1;
        var atksLeft = atksPerFocus;
        // Not sure if this is how OxyBlast works
        if (simStats.oxyBlastAvailable) {
            let invulnAtks = Math.floor(Math.random() * 3) + 1;
            while (invulnAtks-- > 0) {
                phaseHp -= simStats.oxyDmg;
                if (Math.random() >= freeAtkChance)
                    atksLeft -= 1
            }
        }
        while (phaseHp > 0) {
            if (lives <= 0)
                return { victory : false, livesBought, focusesBought };
            if (lives < 1 + livesPerDeath && buyableLives !== 0) {
                // Check to make sure that buying lives would be useful
                let needed = 1 + livesPerDeath - lives;
                if (needed <= buyableLives + offRomanceAvailable) {
                    let bought = Math.min(needed, buyableLives);
                    lives += bought;
                    livesBought += bought;
                    buyableLives -= bought;
                }
            }
            if (offRomanceAvailable && lives === livesPerDeath) {
                offRomanceAvailable = false;
                lives += 1;
                dmgPerSwing = simStats.orDmg;
                deathChance = simStats.orDC / 100;
            }
            if (atksLeft === 0) {
                focusesBought += 1;
                atksLeft += atksPerFocus;
            }
            // Swing
            if (Math.random() >= freeAtkChance)
                atksLeft -= 1;
            if (Math.random() < deathChance) {
                if (Math.random() >= dodgeChance)
                    lives -= livesPerDeath;
                continue;
            }
            phaseHp -= dmgPerSwing;
        }
        return { victory : true, livesBought, focusesBought };
    }

    function runSims(simStats, numSamples) {
        var losses = 0;
        var lifeBuys = []; // counted only for victories
        var focusBuys = []; // ditto
        var simResult;
        for (let i = 0; i < numSamples; ++i) {
            simResult = ripAndTear(simStats);
            if (!simResult.victory) {
                losses += 1;
            } else {
                lifeBuys[simResult.livesBought] = 
                    (lifeBuys[simResult.livesBought] || 0) + 1;
                focusBuys[simResult.focusesBought] =
                    (focusBuys[simResult.focusesBought] || 0) + 1;
            }
        }
        return { losses, lifeBuys, focusBuys };
    }

    function onMessage(evt) {
        var {simStats, numSamples, sequenceNum} = evt.data;
        var result = runSims(simStats, numSamples);
        result.sequenceNum = sequenceNum;
        result.numSamples = numSamples;
        self.postMessage(result);
    }

    self.onmessage = onMessage;
})();
