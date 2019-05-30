(function () { 
    "use strict";

    //
    // Helpful things
    //
    function $(selector, context=document) {
        return context.querySelector(selector);
    }

    function hasClass(elem, cls) {
        var classes = elem.className.split(' ');
        return (classes.indexOf(cls) !== -1);
    }

    function addClass(elem, cls) {
        var classes = elem.className.split(' ');
        var idx = classes.indexOf(cls);
        if (idx !== -1)
            return;
        classes.push(cls);
        elem.className = classes.join(' ');
    }

    function removeClass(elem, cls) {
        var classes = elem.className.split(' ');
        var idx = classes.indexOf(cls);
        if (idx === -1)
            return;
        classes.splice(idx, 1);
        elem.className = classes.join(' ');
    }

    function toggleClass(elem, cls) {
        if (hasClass(elem, cls)) {
            removeClass(elem, cls);
        } else {
            addClass(elem, cls);
        }
    }

    //
    // Player stats
    //
    const bonuses = {'r00t'        : {drainStr : 2}
                    ,'epitaph'     : {drainStr : 2}
                    ,'skullthrone' : {drainStr : 1}
                    ,'lycoris'     : {drain : 5}
                    ,'boomstick'   : {drain : 2}
                    ,'flaskmist'   : {drain : 1}
                    ,'_555phone'   : {drain : 1}
                    ,'r00t-drain'  : {drain : 5}
                    ,'r00t-fu'     : {drain : 2} 
                    ,'amplifier'   : {drain : 2}
                    ,'overclock'   : {drain : 5}
                    ,'aromagrass'  : {edge : 5}
                    ,'wiredrefl'   : {edge : 10}
                    ,'r00t-edge'   : {edge : 10}
                    ,'legacy'      : {lives : 1}
                    ,'guardian'    : {lives : 1}
                    ,'lifefavor'   : {buyableLives : 1}
                    ,'zawazawa'    : {buyableLives : 1}
                    ,'wotan'       : {maxPushDCReduce : 1}
                    ,'bulltime'    : {maxPushDCReduce : 1}
                    ,'timecube'    : {graze : [11]}
                    ,'k-belt'      : {graze : [10]}
                    ,'maxfox'      : {graze : [11]}
                    ,'triedge'     : {dmg : 50}
                    //,'endurance'   : true
                    ,'pinktaser'   : true
                    //,'pinkskull'   : true
                    ,'magnifier'   : true };

    const numFields = {'hacks'      : 'drainStr'
                      ,'season'     : 'drain, drainRng, season'
                      ,'tonicbonus' : 'drain'};

    function readStatsInput() {
        var base = { drain : 0, drainStr : 0, drainRng : 10, edge : 0
                   , lives : 1, buyableLives : 0, maxPushDCReduce : 0
                   , graze : [], dmg : 0, season : 0};
        for (let bonus of Object.keys(bonuses)) {
            if (!$(`#${bonus}`).checked)
                continue;
            if (typeof bonuses[bonus] == 'boolean') {
                base[bonus] = true;
                continue;
            }
            for (let stat of Object.keys(bonuses[bonus])) {
                if (typeof bonuses[bonus][stat] == 'number') {
                    base[stat] += bonuses[bonus][stat];
                } else if (bonuses[bonus][stat] instanceof Array) {
                    base[stat].push(...bonuses[bonus][stat]);
                }
            }
        }
        for (let field of Object.keys(numFields)) {
            let val = 
                Math.max(0, parseInt($(`#${field}`).value || "0"));
            if (field === 'season')
                val = Math.min(50, val);
            for (let stat of numFields[field].split(','))
                base[stat.trim()] += val;
        }
        base.maxPushDCPlus = 
            Math.max(0, maxPush(base.season) - base.maxPushDCReduce);
        return base;
    }

    //
    // Calculated stats
    //

    function maxPush(season) {
        return Math.min(Math.max(0, season-1) * 0.5, 4);
    }

    function toHit(str, rng, diff) {
        if (diff > rng)
            return 0;
        return 1 - (Math.max(0, diff - 1 - str) / rng);
    }

    function deathPercent(stats, daysAlive, useMaxPush=false) {
        return Math.min(100, 
                        1 + daysAlive + useMaxPush * stats.maxPushDCPlus);
    }

    // Average damage with edge but before dmg% bonus 
    // (assuming all successes)
    function baseDmg(stats) {
        return stats.drain / (1 - stats.edge / 100);
    }

    function avgDmg(stats, useMaxPush=false) {
        var pushBonus = useMaxPush * maxPush(stats.season);
        return baseDmg(stats) * (1 + stats.dmg / 100 + pushBonus);
    }

    function addStats(stats, extra) {
        var ret = Object.assign({}, stats);
        for (let stat of Object.keys(extra))
            ret[stat] += extra[stat];
        return ret;
    }

    const teams = {'detective duo' : { edge : 5, dmg : 250 }
                  ,'offline romance' : { drain : 4, lives : 1 }};

    //
    // Helpbox handler
    //
    function onHelpheadClick() { 
        toggleClass($('#helpbox'), 'active');
        toggleClass($('#helphead'), 'active');
    }

    //
    // Phases
    //

    // Replace space-surrounded dashes with en-dashes
    function end(str) {
        return str.replace(' - ', ' \u2013 ');
    }

    function genPhases(phase_specs) {
        let phaselist = [];
        let phases = {};
        for (let [id, name, hp, diff, drainhp, draindiff] of phase_specs) {
            let bigdeath = (id === 'eleventails');
            if (id !== 'eleventails' && id !== 'elevenrevenge') {
                phases[id] = { name, hp, diff, bigdeath };
                phaselist.push(id);
            }
            phases[id + '-drain'] = {name : name + ' (drain)', hp : drainhp
                                    ,diff : draindiff, bigdeath};
            phaselist.push(id + '-drain');
        }
        return [phaselist, phases];
    }

    const [phaselist, phases] = genPhases([
        ['onesin', end('The One Sin - Corrupter of Truth'), 5000, 10, 5000, 10]
       ,['philosopher', end('Philosopher - The Prophet'), 6000, 8, 9000, 13]
       ,['bobo', end('Bobo - The Machinator'), 6000, 8, 9000, 13]
       ,['stench', end('Stench - The Propagation'), 6000, 8, 9000, 13]
       ,['shoujo', end('Shoujo - The Temptress of Drama'), 6000, 7, 9000, 12]
       ,['toroko', end('Toroko - The Avenger'), 10000, 7, 15000, 12]
       ,['jetset', end('Jet Set - The Terror of Death'), 10000, 6, 15000, 11]
       ,['ninetails', end('Nine Tails - The Rebirth'), 14000, 7, 21000, 12]
       ,['tanuki', end('Tanuki - The Mirage of Deceit'), 14000, 7, 21000, 12]
       ,['eleventails', end('The Eleven-Tailed Fox - The Demon Within'),
            0, 0, 11000, 11]
       ,['elevenrevenge', end('The 11-Tailed Revenge - The Demon Returns'),
            0, 0, 20000, 14]]);

    function phaseFormInit() {
        var select = $('#phase-select');
        for (let phaseid of phaselist) {
            let el = document.createElement('option');
            el.value = phaseid;
            el.appendChild(document.createTextNode(phases[phaseid].name));
            select.appendChild(el);
        }
    }

    function readStratForm() {
        return {
            ddMaxPush : $('#dd-strat-max').checked,
            orMaxPush : $('#or-strat-max').checked,
            useOr : $('#or-switch').checked,
            useOxy : $('#oxyblast').checked,
            daysAlive : Math.max(0, parseInt($('#dayslive').value) || 0),
        };
    }

    //
    // Simulation handling
    //
    var simulation = {
        running : false,
        displayedPercentage : 0,
        sequenceNum : 0,
        samplesLeft : 0,
        samplesDone : 0,
        samplesTotal : 0,
        stats : {},
        simStats : {},
        strat : {},
        phase : {},
        results : {},
        workers : [],
    };

    function stamCost(timesFocused) {
        var total = 0;
        var multiplier = simulation.stats.endurance ? 0.75 : 1;
        var discount = simulation.stats.pinkskull ? 20 : 0;
        for (let i = 0; i < timesFocused; ++i)
            total += (200 + i * 100) * multiplier - discount;
        return total;
    }

    function samplesPercent(num) {
        return (num / simulation.samplesTotal * 100);
    }

    function winsPercent(num) {
        return 100 * (
            num / (simulation.samplesTotal - simulation.results.losses));
    }

    //
    // Printing of results
    //

    const resultsSpacerS = '<span style="padding-left : 1.5em"> </span>';
    const resultsSpacerL = '<span style="padding-left : 2em"> </span>';

    function phaseSummaryHTML(phase, strat) {
        return [`<b>Phase:</b> ${phase.name}${resultsSpacerS}(HP: ${phase.hp}`
               ,`Difficulty: ${phase.diff}`
               ,`Days alive: ${strat.daysAlive})`].join(resultsSpacerS);
    }

    function statsSummaryHTML(stats, simStats) {
        var result = [
            `Drain: ${stats.season}+${stats.drain - stats.season}`
          , `Str: ${stats.drainStr}` 
          , `Rng: ${stats.drainRng}`
          , `Edge: ${stats.edge}` 
          , `+Dmg: ${stats.dmg}%`
          , `Lives: ${simStats.lives}+${simStats.buyableLives}`
          , `Maxpush +DC: ${stats.maxPushDCPlus}%`
          , `Graze chance: ${(100 * simStats.dodgeChance).toFixed(0)}%`
          , `To hit: ${(100 * simStats.tohit).toFixed(0)}%`]
          .join(resultsSpacerS);
        var line2 = [];
        if (stats.magnifier)
            line2.push('Magnifier');
        if (stats.pinktaser)
            line2.push('Pink taser');
        if (line2.length > 0)
            result += '<br>' + line2.join(resultsSpacerS);
        return result;
    }

    function stratSummaryHTML(strat, simStats) {
        var stratLine = '<b>Strategy:</b>' + resultsSpacerS;
        var stratSteps = [];
        if (strat.useOxy)
            stratSteps.push(
                `OxyBlast with DD at max push`
              + ` (${simStats.oxyDmg.toFixed(0)} dmg)`);
        stratSteps.push(
            ` DD at ${strat.ddMaxPush ? 'max push' : 'min push'}`
          + ` (Dmg: ${simStats.ddDmg.toFixed(0)}; DC: ${simStats.ddDC}%)`);
        if (simStats.offRomanceAvailable) {
            stratSteps.push(
                `OR at ${strat.orMaxPush ? 'max push' : 'min push'}`
              + ` (Dmg: ${simStats.orDmg.toFixed(0)};`
              + ` DC: ${simStats.orDC}%)`);
        }
        return stratLine + stratSteps.join(' ---&gt; ');
    }

    function printResults() {
        var resbox = $('#resultbox');
        var lines = [];
        lines.push(phaseSummaryHTML(simulation.phase, simulation.strat));
        lines.push(statsSummaryHTML(simulation.stats, simulation.simStats));
        //lines.push(`<b>Number of samples:</b> ${simulation.samplesTotal}`);
        lines.push(stratSummaryHTML(simulation.strat, simulation.simStats));
        // Results (num of lives bought)
        var results = simulation.results;
        var resData = [['Defeat', samplesPercent(results.losses)]];
        resData.push(
            ...results.lifeBuys
            .map((b, i) => [`Win (${i} ${i === 1 ? 'life' : 'lives'} bought)`
                           , samplesPercent(b)])
            .filter(() => true));
        lines.push(`<b>Results:</b>${resultsSpacerS}` +
            resData
            .map(([label, pct]) => `${label}: ${pct.toFixed(1)}%`)
            .join(resultsSpacerL));
        // Stamina costs
        var stamData = (
            results.focusBuys
            .map((b, i) => [i, winsPercent(b)])
            .filter(() => true) // Skip empty slots
            .filter(([i, p]) => p >= 1));
        lines.push(`<b>Focus buys:</b>${resultsSpacerS}` +
            stamData
            .map(([i, p]) => `${i}: ${p.toFixed(1)}%`)
            .join(resultsSpacerL) + '<hr>');
        var p = document.createElement('p');
        p.innerHTML = lines.join('<br>');
        resbox.prepend(p);
    }

    function arrIncrement(arr, deltaArr) {
        deltaArr.forEach((n, i) => {
            arr[i] = (arr[i] || 0) + n;
        });
    }

    const BATCH_SIZE = 1000;
    
    function scheduleJob(worker) {
        var batch = Math.min(simulation.samplesLeft, BATCH_SIZE);
        if (batch <= 0)
            return;
        simulation.samplesLeft -= batch;
        worker.postMessage({sequenceNum : simulation.sequenceNum
                           ,simStats : simulation.simStats
                           ,numSamples : batch});
    }

    function onWorkerMsg(evt) {
        var results = evt.data;
        if (!simulation.running 
                || results.sequenceNum !== simulation.sequenceNum) {
            return;
        }
        simulation.results.losses += results.losses;
        arrIncrement(simulation.results.lifeBuys, results.lifeBuys);
        arrIncrement(simulation.results.focusBuys, results.focusBuys);
        simulation.samplesDone += results.numSamples;
        if (simulation.samplesDone >= simulation.samplesTotal) {
            stopSimulation();
            printResults(simulation.results);
        }
        var {samplesDone, samplesTotal} = simulation;
        var newPercentage = Math.round(100 * samplesDone / samplesTotal);
        if (newPercentage > simulation.displayedPercentage) {
            simulation.displayedPercentage = newPercentage;
            $('#simmsg').innerText = `${newPercentage}%`;
        }
        scheduleJob(this);
    }

    function stopSimulation() {
        simulation.running = false;
        $('#simmsg').innerText = '';
        $('#gobtn').innerText = 'Simulate';
    }

    function startSimulation() {
        var numSamples = parseInt($('#numsamples').value) || 0;
        var phase = phases[$('#phase-select').value];
        if (numSamples <= 0 || !phase)
            return;
        $('#gobtn').innerText = 'Stop';
        $('#simmsg').innerText = '0%';
        var stats = readStatsInput();
        var strat = readStratForm();
        var dd_stats = addStats(stats, teams['detective duo']);
        var or_stats = addStats(stats, teams['offline romance']);
        var tohit = toHit(stats.drainStr, stats.drainRng, phase.diff);
        Object.assign(simulation.simStats, { 
            tohit : tohit
          , oxyDmg : tohit * avgDmg(dd_stats, true)
          , oxyBlastAvailable : strat.useOxy
          , ddDmg : tohit * avgDmg(dd_stats, strat.ddMaxPush)
          , ddDC : deathPercent(dd_stats, strat.daysAlive, strat.ddMaxPush)
          , orDmg : tohit * avgDmg(or_stats, strat.orMaxPush)
          , orDC : deathPercent(or_stats, strat.daysAlive, strat.orMaxPush)
          , offRomanceAvailable : strat.useOr
          , lives : stats.lives
          , buyableLives : stats.buyableLives
          , phaseHp : phase.hp
          , atksPerFocus : stats.pinktaser ? 12 : 10
          , freeAtkChance : stats.magnifier ? 0.13 : 0
          , livesPerDeath : 1 + phase.bigdeath
          , dodgeChance : 1 - stats.graze.reduce(
              (acc, p) => acc * (1 - p / 100), 1) });
        Object.assign(simulation, { stats, phase, strat });
        simulation.displayedPercentage = 0;
        simulation.sequenceNum += 1;
        simulation.samplesLeft = simulation.samplesTotal = numSamples;
        simulation.samplesDone = 0;
        simulation.results = { losses : 0, lifeBuys : [], focusBuys : [] };
        var numThreads = 
            Math.max(parseInt($('#numthreads').value) || 1, 1);
        if (simulation.workers.length > numThreads)
            simulation.workers.length = numThreads;
        while (simulation.workers.length < numThreads) {
            let worker = new Worker('phasesim_worker.js');
            worker.onmessage = onWorkerMsg;
            simulation.workers.push(worker);
        }
        simulation.running = true;
        for (let w of simulation.workers)
            scheduleJob(w);
    }

    //
    // DOM event handling
    //

    // Recalculating player and phase stats after input events
    function updateStatsDisplay(stats, phase) {
        $('#dlvl').innerText = stats.drain;
        $('#dstr').innerText = stats.drainStr;
        $('#drng').innerText = stats.drainRng;
        $('#dedg').innerText = stats.edge + '%';
        $('#dmgplus').innerText = stats.dmg + '%';
        $('#lives').innerText = stats.lives;
        $('#buylives').innerText = stats.buyableLives;
        $('#graze').innerText = 
            '(' + stats.graze.map((n) => n + '').join(' + ') + ')%';
        $('#dcplus').innerText = stats.maxPushDCPlus + '%';
        var dd_stats = addStats(stats, teams['detective duo']);
        $('#mindmg-dd').innerText = avgDmg(dd_stats).toFixed(1);
        $('#maxdmg-dd').innerText = avgDmg(dd_stats, true).toFixed(1);
        var or_stats = addStats(stats, teams['offline romance']);
        $('#mindmg-or').innerText = avgDmg(or_stats).toFixed(1);
        $('#maxdmg-or').innerText = avgDmg(or_stats, true).toFixed(1); 
        // The phase part
        $('#ph-hp').innerText = phases[phase].hp;
        $('#ph-diff').innerText = phases[phase].diff;
        if (phases[phase].bigdeath) {
            addClass($('#eleven-note'), 'active');
        } else {
            removeClass($('#eleven-note'), 'active');
        }
        var tohit = toHit(stats.drainStr, stats.drainRng, phases[phase].diff);
        $('#ph-tohit').innerText = `${Math.round(100 * tohit)}%`;
    }

    function onSimulateClick() {
        if (simulation.running) {
            stopSimulation();
        } else {
            startSimulation();
        }
    }

    function onInput() {
        var phase = $('#phase-select').value;
        if (!phase)
            return;
        updateStatsDisplay(readStatsInput(), phase);
    }

    function setup() {
        $('#statsform').addEventListener('input', onInput);
        $('#helphead').addEventListener('click', onHelpheadClick);
        $('#phase-select').addEventListener('input', onInput);
        $('#gobtn').addEventListener('click', onSimulateClick);
        $('#clearlink').addEventListener('click',
            () => $('#resultbox').innerHTML = '');
        phaseFormInit();
        onInput();
    }

    document.addEventListener('DOMContentLoaded', setup);
})();
