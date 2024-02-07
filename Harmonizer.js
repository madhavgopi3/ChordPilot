import Chord from './Chord.js';
import * as Enums from './Chord.js';
import Note from './Note.js'


export default class Harmonizer {

    key = new Note(0);

    melody = [];
    durations = [];

    melodyPB =[];
    durationsPB = [];
    bpm = 120;

    complexity = 0;
    barLength = 16;
    numOfBars = 0;

    chords = [];
    scores = [];

    chosenChords = [];
    chosenIndices = []; //we might need it for color

    static stopPlaying = false;

    constructor(key,melodyValues,durations,complexity,barLength,bpm){
        this.setKey(parseInt(key));
        this.melodyPB = melodyValues;
        this.durationsPB = durations;
        let bars = Harmonizer.splitToBars(melodyValues,durations,barLength);
        bars = Harmonizer.removeRests(bars);     
        [this.melody,this.durations] = bars;   
        this.setComplexity(parseInt(complexity));
        this.barLength = barLength;
        this.numOfBars = this.melody.length;
        this.bpm = parseInt(bpm);
        this.initChordsFromMelody(bars);
    }

    setComplexity(complexity){
        this.complexity= complexity;
        Chord.setComplexity(complexity);
    }
    setKey(key){
        let myKey = new Note(key);
        this.key= myKey;
        Chord.setKey(myKey);
    }

    chooseChord(barNumber,chordIndex){

        this.chosenChords[barNumber] = this.chords[barNumber][chordIndex];
        this.chosenIndices[barNumber] = chordIndex;

        const nextBar = barNumber+1;
        
        if(nextBar < this.numOfBars){
            let [sortedChords,sortedScores] = this.reSort(nextBar);
            this.chords[nextBar] = sortedChords;
            this.scores[nextBar] = sortedScores;
            this.chosenIndices[nextBar]=-1;
            this.chosenChords[nextBar]=this.chords[nextBar][0];
        }
    }
    
    getChordStrings(){
        
        const strings = this.chords.map(chordList =>
            (chordList.map(chord => chord.toString())).slice(0, 6)
        );
        return strings;

    }

    initChordsFromMelody(bars){

        for (let i = 0; i < this.numOfBars; i++) {
            let myNotes = Note.notesFactory(bars[0][i]);
            let myDurations = bars[1][i];
            let myChords = Harmonizer.scoreChords(myNotes,myDurations);
            [this.chords[i],this.scores[i]] = Harmonizer.calculateAndSortChords(myChords.flat(),myNotes,myDurations);
            this.chosenChords[i] = this.chords[i][0];
            this.chosenIndices[i] = -1;
            
        }
    }

    static scoreChords(notes,durations) {
        let myChords = [];
        const thresh = 0.4;
        function scoreChordsFromEnum(chordEnum, notes,durations) {
            let recommendedChords = [];
        
            Object.keys(chordEnum).forEach(key => {
                const chord = chordEnum[key];
                const score = chord.calculateChordScore(notes,durations);
                
                if (score>thresh) {
                    recommendedChords.push(chord);
                }
            });
            myChords.push(recommendedChords);
            return recommendedChords;
        }
        let diatonicChords =[];
        let secondaryDominants =[]; 
        let relatedm7SecondaryDominants =[]; 
        let substituteDominants =[]; 
        let relatedm7SubstituteDominants =[];
        let subdominantMinorChords = [];
        let modalInterchangeChords =[];
        let melodicMinorChords = [];

        switch (Chord.complexity) {
            case 4:
                relatedm7SubstituteDominants = scoreChordsFromEnum(Enums.Relatedm7OfSubstituteDominants, notes, durations);
                melodicMinorChords = scoreChordsFromEnum(Enums.MelodicMinorChords, notes, durations);
            case 3:
                substituteDominants = scoreChordsFromEnum(Enums.SubstituteDominants, notes, durations);
                modalInterchangeChords = scoreChordsFromEnum(Enums.ModalInterchangeChords, notes, durations);
            case 2:
                relatedm7SecondaryDominants = scoreChordsFromEnum(Enums.Relatedm7OfSecondaryDominants, notes, durations);
                subdominantMinorChords = scoreChordsFromEnum(Enums.SubdominantMinorChords, notes, durations); 
            case 1:
                secondaryDominants = scoreChordsFromEnum(Enums.SecondaryDominants, notes, durations);       
            default:
                diatonicChords = scoreChordsFromEnum(Enums.DiatonicChords, notes, durations);
                break;
        }
        return myChords;
        
    }
    
    static calculateAndSortChords(chords, melodyNotes, noteDurations) {
        const chordScores = chords.map(chord => ({
            chord,
            score: chord.calculateChordScore(melodyNotes, noteDurations)
        }));
    
        // Sort chords in descending order based on scores
        const sortedChords = chordScores.sort((a, b) => b.score - a.score);
    
        // Extract chords and scores separately
        const sortedChordArray = sortedChords.map(item => item.chord);
        const sortedScoreArray = sortedChords.map(item => item.score);
    
        return [sortedChordArray, sortedScoreArray];
    }
    
    reSort(barNumber){
        const chords = this.chords[barNumber];
        const melodyNotes = Note.notesFactory(this.melody[barNumber]);
        const noteDurations =this.durations[barNumber];
        const previousChord = this.chosenChords[barNumber-1];

        const isLastBar = this.numOfBars == barNumber+1;
        const chordScores = chords.map(chord => ({
            chord,
            score: (chord.calculateChordScore(melodyNotes, noteDurations,( (previousChord.isFifthDownFrom(chord)?1:0) +(chord.isFifthDownFrom(previousChord)?1:0) + (previousChord.resolvesTo(chord)?1:0) ),isLastBar) 
            ) 
        }));
    
        // Sort chords in descending order based on scores
        const sortedChords = chordScores.sort((a, b) => b.score - a.score);
    
        // Extract chords and scores separately
        const sortedChordArray = sortedChords.map(item => item.chord);
        const sortedScoreArray = sortedChords.map(item => item.score);
    
        return [sortedChordArray, sortedScoreArray];
    }
    
    static splitToBars(values, durations, barLength) {
        let acc = 0; // accumulator
        let barNumber = 0;
        let outValues = [[]]; // Initialize with an empty array for the first bar
        let outDurations = [[]]; // Initialize with an empty array for the first bar
        
        // Copy the values and durations arrays and reverse them
        let valuesStack = [...values].reverse();
        let durationsStack = [...durations].reverse();
    
        while (valuesStack.length > 0) {
            const currentValue = valuesStack.pop();
            const currentDuration = durationsStack.pop();
    
            if(acc+currentDuration>barLength){
                outValues[barNumber].push(currentValue);
                outDurations[barNumber].push(barLength-acc);
                valuesStack.push(currentValue);
                durationsStack.push(currentDuration-(barLength-acc));
                acc=0;
                barNumber++;
                outValues[barNumber]=[];
                outDurations[barNumber]=[];
            }else if(acc+currentDuration===barLength){
                outValues[barNumber].push(currentValue);
                outDurations[barNumber].push(currentDuration);
                acc=0;
                barNumber++;
                outValues[barNumber]=[];
                outDurations[barNumber]=[];
            }else { //acc+currentDuration<barLength
                outValues[barNumber].push(currentValue);
                outDurations[barNumber].push(currentDuration);
                acc+=currentDuration;
            }
    
            if(acc>barLength){
                console.log('something is wrong: accumulator greater than bar')
            }
        }
        if(outValues[barNumber].length ===0 ){
            outValues.splice(barNumber,1);
            outDurations.splice(barNumber,1);
        }
        return [outValues,outDurations];
    }
    
    static removeRests(bars) {
        let [myValues, myDurations] = bars;
    
        for (let i = 0; i < myValues.length; i++) {
            const indexesToRemove = [];
            for (let j = 0; j < myValues[i].length; j++) {
                if (myValues[i][j] === -1) {
                    indexesToRemove.push(j);
                }
            }
    
            // Remove rests from values and corresponding durations
            for (let k = indexesToRemove.length - 1; k >= 0; k--) {
                myValues[i].splice(indexesToRemove[k], 1);
                myDurations[i].splice(indexesToRemove[k], 1);
            }
        }
    
        return [myValues, myDurations];
    }
    
    
    // plays chords and melody together
    playChords(){

        Harmonizer.stopPlaying = false;

        const beatTime = 60/(this.bpm * 4);
    
        const c = new AudioContext();
        const g = c.createGain();
        const comp = c.createDynamicsCompressor();
        g.connect(comp);
        g.gain.value = 0.3;
        comp.connect(c.destination);
        const attack = 0.1;
    
        const chordDuration = this.barLength;

        function chordsToLines(chords){
            let roots =[];
            let fifths = [];
            let thirds = [];
            let sevenths = [];
            let times = [];
    
            chords.forEach((chord, i) => {
                let arr = chord.type.notes.map(note => note.getTransposed(Chord.key.value+chord.root.value,true));
    
                roots[i] = arr[0].value + 36;
                fifths[i] = arr[2].value + 48;
                thirds[i] = arr[1].value + 60;
                sevenths[i] = arr[3].value + 60;
    
                times.push(chordDuration);
            });
    
            return [roots,thirds,fifths,sevenths,times];
        }
    
        function playNote(note,time,type="sine",peak=0.2) {
            const o = c.createOscillator();
            const freq = 440 * ( 2**((note-69)/12) ); //freq = 440*2^((n-69)/12)
            const myG = c.createGain();
            o.frequency.value = freq;
            o.type = type;
            o.connect(myG);
            
            myG.gain.value=0;
            o.connect(myG);
            myG.connect(g);
            myG.gain.setValueAtTime(0,c.currentTime);
            myG.gain.linearRampToValueAtTime(peak,c.currentTime + attack);
            myG.gain.linearRampToValueAtTime(0,c.currentTime + (time*beatTime) );
            o.start(c.currentTime);
            o.stop(c.currentTime + time*beatTime);
        }
        
        function playLine(notes,times,i=0,type="sine",peak=0.2) {
            if(notes[i] != -1){
                playNote(notes[i],times[i],type,peak);
            }
            if ((i< notes.length-1) && (Harmonizer.stopPlaying != true)) {                
                setTimeout(() => playLine(notes,times,i+1,type,peak), times[i]*1000*beatTime);
            }             
        }
    
        let [roots,thirds,fifths,sevenths,times] = chordsToLines(this.chosenChords);
    
        playLine(this.melodyPB,this.durationsPB,0,"triangle",0.6);
        playLine(roots,times);
        playLine(thirds,times);
        playLine(fifths,times);
        playLine(sevenths,times);
    }
    stopChords(){
        Harmonizer.stopPlaying = true;
    }
} 


