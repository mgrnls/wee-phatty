"use strict"

const context = new AudioContext();

// this is so that you can use chrome...
document.getElementById("start").addEventListener('click', function() {
  context.resume().then(() => {
    console.log('Playback resumed successfully');
  });
});

// Set up the global ASDR variables.
let attack = 0.1;
let decay = 0.1;
let sustain = 0.5;
let release = 0.5;

// This is how we should do the oscBank, will let us choose how many oscs we
// want in advance.
let oscBank = {};
let numOsc = 10;

for (let i = 0; i < numOsc; i++) {
    let osci = "osc" + i;
    let voli = "vol" + i;
    let gaini = "gain" + i;
    let bandi = "band" + i;

    // create the two oscillators
    oscBank[osci + "a"] = context.createOscillator();
    oscBank[osci + "b"] = context.createOscillator();

    // create the two gain nodes to control the volume of the oscilltors
    oscBank[gaini + "a"] = context.createGain();
    oscBank[gaini + "b"] = context.createGain();

    // create the filter node
    oscBank[bandi] = context.createBiquadFilter()
    oscBank[bandi].type = "bandpass";

    // create the ADSR gain node
    oscBank[voli] = context.createGain();

    // connect all the nodes together
    oscBank[osci + "a"].connect(oscBank[gaini + "a"]);
    oscBank[osci + "b"].connect(oscBank[gaini + "b"]);
    oscBank[gaini + "a"].connect(oscBank[bandi]);
    oscBank[gaini + "b"].connect(oscBank[bandi]);
    oscBank[bandi].connect(oscBank[voli]);

    // for both of the volume nodes, set the gain to be 0.5
    oscBank[gaini + "a"].gain.value = 0.5;
    oscBank[gaini + "b"].gain.value = 0.5;

    // set the ADSR volume to be zero
    oscBank[voli].gain.setValueAtTime(0, context.currentTime);

    // start both the oscillators
    oscBank[osci + "a"].start();
    oscBank[osci + "b"].start();
}

document.addEventListener('keydown', logKeyDown);
document.addEventListener('keyup', logKeyUp)

function logKeyDown(e) {
    if (e.code in keyToFrequency) {
        if (!keyPresses[e.code]) {
            if (buffer.length > 0) {
                noteTracker[e.code] = buffer.shift();
                keyPresses[e.code] = true;
                startOsc(e.code);
            }
        }
    }
    else if (e.keyCode == '38') {
        if (!keyPresses[e.code]) {
            keyPresses[e.code] = true;
            octaveUp();
        }
    }
    else if (e.keyCode == '40') {
        if (!keyPresses[e.code]) {
            keyPresses[e.code] = true;
            octaveDown();
        }
    }
}

function logKeyUp(e) {
    if (e.code in keyToFrequency) {
        if (e.code in noteTracker) {
            keyPresses[e.code] = false;
            endOsc(e.code)
            buffer.push(noteTracker[e.code]);
            delete noteTracker[e.code];
        }
    }
    else if (e.keyCode == '38') {
        keyPresses[e.code] = false
    }
    else if (e.keyCode == '40') {
        keyPresses[e.code] = false
    }
}

let buffer = [];

for (let i = 0; i < numOsc; i++){
	buffer.push(i);
}

// somehow keeps track of which notes correspond to which oscillator
let noteTracker = {}

function startOsc(key) {
    let osci = "osc" + noteTracker[key];
    let voli = "vol" + noteTracker[key];
    let bandi = "band" + noteTracker[key];
    
    // create the new ADSR node
    oscBank[voli] = context.createGain();

    // connect the filter to the new node
    oscBank[bandi].connect(oscBank[voli]);

    //oscBank[osci].connect(oscBank[voli]);
    oscBank[voli].connect(context.destination);
    oscBank[voli].gain.setValueAtTime(0, context.currentTime);

    // set the frequency of the oscillators
    oscBank[osci + "a"].frequency.setValueAtTime(keyToFrequency[key], context.currentTime);
    oscBank[osci + "b"].frequency.setValueAtTime(keyToFrequency[key], context.currentTime);

    oscBank[voli].gain.setValueAtTime(0, context.currentTime);
    oscBank[voli].gain.linearRampToValueAtTime(1, context.currentTime + attack);
    oscBank[voli].gain.linearRampToValueAtTime(sustain, context.currentTime + attack + decay);
    sustainStart["Key" + key] = context.currentTime + attack + decay;
}

function endOsc(key) {
    let voli = "vol" + noteTracker[key];

    if (context.currentTime <= sustainStart["Key" + key]) {
        oscBank[voli].gain.setValueAtTime(sustain, sustainStart["Key" + key]);
        oscBank[voli].gain.setValueCurveAtTime([sustain, 0], sustainStart["Key" + key], release);
    }
    else {
        oscBank[voli].gain.setValueAtTime(sustain, context.currentTime);
        oscBank[voli].gain.linearRampToValueAtTime(0, context.currentTime + release);
    }
}

// the 12th root of 2, we will use this to mutiply the base freqeuncy to get
// an equal temperment of keys
const e = Math.pow(2, 1 / 12);

// these are they keyboard keys that we will use as the triggers, in order of
// pitch
let keys = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K"];


// Lets you know which key corresponds to which frequency.
let keyToFrequency = {};

for (var i = 0; i < keys.length; i++){
    keyToFrequency["Key" + keys[i]] = 261.63 * Math.pow(e, i);
}

// keyPresses keeps track of whether a key is being held down. This helps stop
// the "holding down a key means repeated pushes of that key" effect.
let keyPresses = {};

for (var key in keyToFrequency) {
    keyPresses[key] = false;
}

// The sustainStart object tracks when the release finishes and the sustain
// starts for each oscillator. This is used when the keyup eventListener is 
// triggered.
let sustainStart = {}

// These are the event listeners for the sliders and buttons in the document.
document.getElementById("attack").addEventListener('input', function() {
    attack = Number(this.value);
});

document.getElementById("decay").addEventListener('input', function() {
    decay = Number(this.value);
});

document.getElementById("sustain").addEventListener('input', function() {
    sustain = Number(this.value);
});

document.getElementById("release").addEventListener('input', function() {
    release = Number(this.value);
});

// Event listeners for the first oscillators
document.getElementById("sinea").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "a"].type = "sine";
    }
});

document.getElementById("sawtootha").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "a"].type = "sawtooth";
    }
});

document.getElementById("squarea").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "a"].type = "square";
    }
});

document.getElementById("trianglea").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "a"].type = "triangle";
    }
});

// Event listeners for the second oscillators
document.getElementById("sineb").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "b"].type = "sine";
    }
});

document.getElementById("sawtoothb").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "b"].type = "sawtooth";
    }
});

document.getElementById("squareb").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "b"].type = "square";
    }
});

document.getElementById("triangleb").addEventListener('click', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["osc" + i + "b"].type = "triangle";
    }
});

// The event listeners for the band pass filter
document.getElementById("filterQ").addEventListener('input', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["band" + i].Q.value = Number(this.value);
    }
});

document.getElementById("filterFreq").addEventListener('input', function() {
    for (let i = 0; i < numOsc; i++) {
        oscBank["band" + i].frequency.value = Number(this.value);
    }
});

document.getElementById("oscvols").addEventListener('input', function() {
    let alpha = Number(this.value);

    for (let i = 0; i < numOsc; i++) {
        let gaini = "gain" + i;
        oscBank[gaini + "a"].gain.value = alpha;
        oscBank[gaini + "b"].gain.value = 1 - alpha;
    }
});

document.getElementById("detune1").addEventListener('input', function() {
    let detune = Number(this.value);

    for (let i = 0; i < numOsc; i++) {
        let osci = "osc" + i;
        oscBank[osci + "a"].detune.value = detune;
    }
});

document.getElementById("detune2").addEventListener('input', function() {
    let detune = Number(this.value);

    for (let i = 0; i < numOsc; i++) {
        let osci = "osc" + i;
        oscBank[osci + "b"].detune.value = detune;
    }
});

// change the octave of the keys
function octaveDown() {
    for (var i = 0; i < keys.length; i++){
        keyToFrequency["Key" + keys[i]] *= 0.5;
    }
}

function octaveUp() {
    for (var i = 0; i < keys.length; i++){
        keyToFrequency["Key" + keys[i]] *= 2;
    }
}
