import * as fs from 'fs';
import * as midiManager from 'midi-file';
import { fileURLToPath } from 'url';

const debug = false;

let trackDir = new URL('../tracks', import.meta.url);
let trackFiles = fs.readdirSync(trackDir).filter(file => file.endsWith('.mid'));

for (let file of trackFiles) {
  // Reset buffer for each file
  let buffer = [];
  
  const input = fs.readFileSync(trackDir.href.replace('file://', '') + '/' + file);

  // Convert buffer to midi object
  const parsed = midiManager.parseMidi(input);

  // Normalize all events with millisecond timestamps
  const normalizedEvents = sqashMidiFileToSingleTimestampedTrack(parsed);
  
  // Filter to only note events from specified tracks and sort by timestamp
  const noteEvents = normalizedEvents
    .filter(event => 
      (event.type === 'noteOn' || event.type === 'noteOff')
    )
    .sort((a, b) => a.timestamp - b.timestamp)

  let lastTimestamp = 0;
  for (let event of noteEvents) {
    const delay = Math.max(0, event.timestamp - lastTimestamp);
    writeDelay(buffer, delay);
    writeNote(buffer, event.noteNumber, event.type === 'noteOn');
    lastTimestamp = event.timestamp;
  }

  // end track
  buffer.push(0xff);
  buffer.push(0xff);
  buffer.push(0xff);
  buffer.push(0xff);

  // Save buffer to .liztrack file
  if (!debug && buffer.length > 0) {
    const filename = file.replace('.mid', '.liztrack');
    const outputPath = trackDir.href.replace('file://', '') + '/' + filename;
    const bufferData = Buffer.from(buffer);
    fs.writeFileSync(outputPath, bufferData);
  }

}

function sqashMidiFileToSingleTimestampedTrack(parsed) {
  // Handle MIDI timing division (ticks per quarter note vs SMPTE)
  let ticksPerBeat;
  let isFrameBased = false;
  
  // Try different possible property names for timing division
  const timingDivision = parsed.ticksPerBeat || parsed.timeDivision || (parsed.header && parsed.header.ticksPerBeat) || (parsed.header && parsed.header.timeDivision);
  
  if (timingDivision > 0) {
    // Standard format: ticks per quarter note
    ticksPerBeat = timingDivision;
  } else {
    // SMPTE format: negative value encodes frame rate and ticks per frame
    const frameRate = -(timingDivision >> 8);
    const ticksPerFrame = timingDivision & 0xFF;
    ticksPerBeat = frameRate * ticksPerFrame * 4; // Convert to equivalent ticks per quarter note
    isFrameBased = true;
  }
  
  if (ticksPerBeat <= 0 || !isFinite(ticksPerBeat)) {
    console.error('Invalid ticksPerBeat:', ticksPerBeat, 'using fallback');
    ticksPerBeat = 480; // Safe fallback
  }
  
  // First pass: Build tempo map from ALL tracks
  const tempoMap = [];
  parsed.tracks.forEach((track, trackNumber) => {
    let currentTick = 0;
    track.forEach(event => {
      currentTick += event.deltaTime;
      if (event.type === 'setTempo') {
        tempoMap.push({
          tick: currentTick,
          microsecondsPerBeat: event.microsecondsPerBeat
        });
      }
    });
  });
  
  // Sort tempo map by tick position
  tempoMap.sort((a, b) => a.tick - b.tick);
  
  // Add default tempo at beginning if no tempo is set at tick 0
  if (tempoMap.length === 0 || tempoMap[0].tick > 0) {
    tempoMap.unshift({ tick: 0, microsecondsPerBeat: 500000 }); // 120 BPM default
  }
  
  // Function to get tempo at a specific tick
  function getTempoAtTick(tick) {
    for (let i = tempoMap.length - 1; i >= 0; i--) {
      if (tempoMap[i].tick <= tick) {
        return tempoMap[i].microsecondsPerBeat;
      }
    }
    return 500000; // Default fallback
  }
  
  // Function to convert ticks to milliseconds
  function ticksToMilliseconds(fromTick, toTick) {
    if (fromTick === toTick) return 0;
    
    let totalMs = 0;
    let currentTick = fromTick;
    
    // Find all tempo changes between fromTick and toTick
    const relevantTempos = tempoMap.filter(t => t.tick > fromTick && t.tick <= toTick);
    
    for (let tempoChange of relevantTempos) {
      const tempo = getTempoAtTick(currentTick);
      const ticksInSegment = tempoChange.tick - currentTick;
      const msPerTick = (tempo / 1000) / ticksPerBeat;
      totalMs += ticksInSegment * msPerTick;
      currentTick = tempoChange.tick;
    }
    
    // Handle remaining ticks after last tempo change
    if (currentTick < toTick) {
      const tempo = getTempoAtTick(currentTick);
      const ticksInSegment = toTick - currentTick;
      const msPerTick = (tempo / 1000) / ticksPerBeat;
      totalMs += ticksInSegment * msPerTick;
    }
    
    return totalMs;
  }
  
  // Second pass: Collect all events with absolute tick positions
  const allEvents = [];
  parsed.tracks.forEach((track, trackNumber) => {
    let currentTick = 0;
    track.forEach(event => {
      currentTick += event.deltaTime;
      allEvents.push({
        ...event,
        trackNumber,
        absoluteTick: currentTick
      });
    });
  });
  
  // Sort events by absolute tick position
  allEvents.sort((a, b) => a.absoluteTick - b.absoluteTick);
  
  // Third pass: Convert to millisecond timestamps
  const eventsWithTimestamps = allEvents.map(event => {
    const timestamp = ticksToMilliseconds(0, event.absoluteTick);
    
    return {
      ...event,
      timestamp: Math.floor(timestamp)
    };
  });
  
  return eventsWithTimestamps;
}

function writeDelay(buffer, delayMs) {
  delayMs = Math.floor(delayMs);
  if (debug) {
    process.stdout.write(' ' + delayMs.toString(16).padStart(8, '0'));
  } else {
    // Store as 3-byte little-endian (LSB first)
    buffer.push(delayMs & 0xFF);           // Byte 0 (LSB)
    buffer.push((delayMs >> 8) & 0xFF);    // Byte 1
    buffer.push((delayMs >> 16) & 0xFF);   // Byte 2
  }
}

function writeNote(buffer, noteNumber, isOn) {
  let firstBit = isOn ? 0x80 : 0x00;
  if (debug) {
    process.stdout.write(' ' + (noteNumber + firstBit).toString(16).padStart(2, '0'));
  } else {
    buffer.push(noteNumber + firstBit);
  }
}