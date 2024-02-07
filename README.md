# Melody Harmoniser

Melody Harmoniser is a tool that suggests possible chords for each bar when a melody is provided. It lets the user input a melody and displays the corresponding chords for each bar, with the suggestions dynamically changing based on the user's choices.

This enables both advanced and amateur musicians to explore the magic of chords, by inputting any melody of their liking, with an easy to navigate user interface. The only pre-requisite is the knowledge to draw notes on a pianoroll, which is the easiest form of music input.

While the tool is capable of harmonising a melody on its own, the main use for this tool is to add some more suggestions that the user might be interested in. In other words, the user can get different possibilities on how they want to harmonise the melody. The goal is to give the user the flexibility to choose from multiple chord options with real-time playback to test them out.

## Implementation

Inputs from the user are:
* Tempo
* Key of the melody
* Required complexity of the chords
* Melody input using a piano roll


The output is an easy-to-read list of chords for each bar, ranked in order of suitability, which dynamically updates based on the user selections.


### Piano Roll and MML 

The piano roll is implemented using [webaudio-pianoroll](https://github.com/g200kg/webaudio-pianoroll), which is a GUI library for displaying piano rolls used in music applications. 
The output from this pianoroll is by default stored in the form of Music Macro Language (MML). MML is a method of transcribing musical notation as sequence data, which then gets processed into binary performance data, akin to MIDI, for a computer to playback.

MML can be decoded in the following way:

* cdefgab — The letters a to g correspond to the musical pitches and cause the corresponding note to be played.
* Black key notes are produced by appending a - with the next white key.
* The length of a note is specified by appending a number representing its length as a fraction of a whole note and adding a dot(.) whenever it is a dotted note.
* l — Followed by a number, specifies the default length used by notes or rests which do not explicitly define one.
* r — A pause or rest. The length of the rest is specified in the same manner as the length of a note.
* o — Followed by a number, o selects the octave the instrument will play in.
* t — Followed by a number, sets the tempo in beats per minute.

An example of a 4 bar melody in MML: t120o4l8cr8.d16ro5c4r16o6a-8.

The tempo here is 120 (t120), starts on octave 4 (o4), default note length is 1/8 (l8). Breaking down the MML:


| Notation  | Note+Octave/Rest   | Note/Rest Value | 
| :-------------: |:-------------:| :-----:|
| c     | c4 | 8th |
| r8  | rest      |  Dotted 8th |
| d16 | d4     |    16th  |
| r     | rest | 8th |
| o  | default octave change to 5      |  -- |
| c4 | c5     |    4th  |
| r16     | rest | 16th |
| o6  |   default octave change to 6     | -- |
| a-8. | a6    |    Dotted 8th  |



The key challenges in implementing the user input functionality was extracting the output from the piano roll according to our requirements. Since there is no delimiter in an MML string between notes/rests/octaves, 
the presence (and sometimes absence) of alphabets, numbers and other special characters which contains rests, note, octave information all combined into one, made parsing the string tricky.
Using conditional statements and regulax expressions such as slice, match and replace functions of javascript, the single MML string output was parsed and segmented into
* Tempo
* Notes
* Rests
* Durations of notes/rests
* Octave

These informations can be viewed in the browser console, once the "Generate Chords" button is clicked.

The notes and octaves are then converted into an integer using the formula 

*notevalue+12(octave+1)*

where notevalue is 0 for c, 1 for d flat and so on, upto 12 for b.

After the input is taken from the piano roll and converted into note values and durations, it is fed into the part of the code that does the calculations for suggesting chords: the Harmonizer.

## The Harmonizer

First, it is important to outline the structures used to represent notes and chords.

### The Note class:

To create a Note object, the Note class takes an integer representing the MIDI value assigned to a note. The MIDI value is stored, and a more generic value is calculated ( MIDI value % 12 )and stored to represent the note. This is the value used later to make most of the calculations.

The Note class has some functions that are specific for note calculations such as transposing notes, and making Note objects from an array of numbers.

An important feature of the note class is being able to return the correct name of a black key depending on the key. For example, in the key of F, the note B♭ would not be represented as A♯. This is done by storing the key as a static variable for the Note class, and the toString function is coded with that in mind.

### The Chord Class:

A chord object does not describe a chord like Fmaj7. It describes the more generic idea of a chord in functional harmony in any key, such as IVmaj7. An easier way to think about it is the input is transposed to the key of C, where all the calculations happens, and then the output is transposed back to the original key.

To create a Chord object the Chord class, the Chord class takes: 
* A number or a note object as the root
* A "chord type" which specifies the notes in the chord, relative to the root, as well as the symbol used for the chord
* The allowed scales for this chord

These are the available chord types

| Type | Symbol |
| :--: |:--:| 
|Maj7   | Δ  
|Maj6   |  6    
|Maj7s5 |  Δ♯5 
|Maj7b5 |   Δ♭5
|dom7    |   7
|dom7sus4 | 7sus4
|dom7s5   |  +7 
|m7      | -7 
|mMaj7   |  -Δ 
|m6       | -6 
|m7b5    |  ø 
|dim7    |   ° 

These are the available scales:
* Ionian
* Dorian
* Phrygian
* Lydian
* Mixolydian
* Aeolian
* Locrian
* Mixolydian ♭9
* Mixolydian ♭13
* Mixolydian ♭9♭13
* Lydian ♭7
* Whole Tone 
* Symmetrical Diminished Half-Whole
* Altered
* Melodic minor
* Dorian ♭2
* Sus4 ♭9 scale
* Lydian Augmented
* Locrian ♮9
* Super Locrian

Each scale is split into 3 categories of notes:
* chord tones: notes in the chord related to the scale
* tension notes: notes in the scale that create tension (in a good way) when played with the chord
* avoid notes: notes in the scale that sound a bit dissonant when played with the chord

These categories are important for suggesting chords.

The chord class also has functions that are specific to chord operations, including converting the chord to a string and, most importantly, the function that calculates a score for each chord based on the melody notes.

Here are all the Chord groups included:
* Diatonic Chords (chords in the major scale)
* Secondary Dominant Chords
* Related m7 Chords of Secondary Dominants
* Substitute Dominant Chords
* Related m7 Chords of Substitute Dominants
* Sub-Dominant Minor Chords
* Modal Interchange Chords
* Chords in the Melodic Minor scale

This is already a really long list of chords. Some other chords used in common practice were not added. This is because the conditions under which they are used aren't as generic as these chords. Maybe this could be something that could be added later. (Diminished passing chords, Slash chords, special function dominant chords etc.)

### Chord Score:

A score is calculated to represent how "suitable" each chord is for a certain set of notes. The score is calculated by assigning a certain value between 1 and -1 to each category of notes (chord tones, tension notes, avoid notes, notes out of the scale). These values are different for each level of complexity. A separate score is assigned to the root note as well. The initial score of a chord is the sum of scores for each note in the melody, weighted by their duration. This way, longer notes have more influence shorter notes over which chord is chosen.

Moreover, some bonuses (in the form of extra notes with the score of 1) are added depending on the previous chord, and another bonus if the chord is the Tonic chord in the last bar.

The score calculation is just a way to approximately measure if a chord will sound good with a group of notes. 

### The Harmonizer class

The harmonizer object is where all the processing happens. When the user enters the inputs and presses the "Generate" button, a new harmonizer object is created using all the inputs. The harmonizer splits the melody into bars, removes all the rests, and calculates a score for every chord with every bar. Only chords with a score above a certain threshold are kept, and the chord options for each bar are sorted. The 6 chords with the highest scores for each bar are then converted to strings and displayed on the screen. 

When the user chooses a chord, this chord is stored along with its index (the index is used to change the color of the cells with the chosen chords). The scores for the next bar are then recalculated, based on the user's choice. This will encourage dominant chords to resolve, and adjacent chords to be a fourth or a fifth apart. For example, if the user chooses a G7 chord, all chords in the next bar with C as the root will receive a bonus when the score is recalculated.

The harmonizer class is also where the notes and the chords are played back. When the object is first created, it keeps a version of the original melody, with all the rests, for the playback. In addition, before playing the chords, they have to be split to separate lines, one for each note of the chord. The notes are put into different octaves in this way: 

| Note | Octave |
|:--:|:--:|
|root| 2 |
|fifth| 3 |
|third| 4 |
|seventh| 4 |

For example a Cmaj7 chord will be played as: C2 G3 E4 B4

This creates generic open voicings that allow thirds and sevenths to resolve nicely when subsequent chords are a fifth or a semitone apart. These voicings are played with a sine tone, while the melody is played with a triangle wave shape at a louder volume. This is to enable the user to hear the chords separately from the melody.

## Styling and Output

The goal was to design a no-frills, sleek and minimalist interface, which is easy to navigate from the top to the bottom. In case the user wishes to test the functionality of the project before inputting their own melody, a dropdown is provided with 3 preset songs "Hey Jude", "Never Gonna Give You Up" and "Every Breath You Take". 

The dropdowns, buttons, the pianoroll, output chords' display have been modified to be responsive and cohesive with the design principle. The buttons are styled using the "before" pseudo element and the "hover" style to indicate interactivity, which basically overlays a circular animation over the button when the cursor is hovered over it.

The chord output is displayed using a canvas. The canvas is drawn using a 2D array of strings. The cell width and height are calculated by dividing the total width and height by the number of columns and the number of cells in the longest column. The harmonizer object stores the indices of the chosen chords, so the corresponding cells could be colored differently. When the user clicks anywhere in the canvas, an function is triggered that find out which cell was clicked using the x and y coordinates of the canvas origin and the click event. The appropriate functions are then called to re-calculate the chord scores and redraw the canvas to update the output.






 


