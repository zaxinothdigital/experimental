onclick = () => {
	document.querySelector('#contents').style.display = "block";
  ready();
  onclick = null;
}

var ctx;


var reverseButton = document.querySelector('#reverse');
var slowButton = document.querySelector('#slow');
var fastButton = document.querySelector('#fast');

reverseButton.onclick = (e) => {
	var newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
  
  for (var i = 0; i < newBuffer.numberOfChannels; i++) {
  	var data1 = audioBuffer.getChannelData(i);
    var data2 = newBuffer.getChannelData(i);
    
    for (var j = 0; j < newBuffer.length; j++) {
    	data2[j] = data1[(data1.length - 1) - j];
    }
  }
  
  audioBuffer = newBuffer;
  
  loadBuffer();
}

slowButton.onclick = (e) => {
	var newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length * 2, audioBuffer.sampleRate);
  
  for (var i = 0; i < newBuffer.numberOfChannels; i++) {
  	var data1 = audioBuffer.getChannelData(i);
    var data2 = newBuffer.getChannelData(i);
    
    for (var j = 0; j < newBuffer.length; j++) {
    	data2[j] = data1[Math.floor(j / 2)];
    }
  }
  
  audioBuffer = newBuffer;
  
  loadBuffer();
}

fastButton.onclick = (e) => {
	var newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, Math.floor(audioBuffer.length / 2), audioBuffer.sampleRate);
  
  for (var i = 0; i < newBuffer.numberOfChannels; i++) {
  	var data1 = audioBuffer.getChannelData(i);
    var data2 = newBuffer.getChannelData(i);
    
    for (var j = 0; j < newBuffer.length; j++) {
    	data2[j] = data1[j * 2];
    }
  }
  
  audioBuffer = newBuffer;
  
  loadBuffer();
}


var audioBuffer;

var audioInput = document.querySelector('#audioinput');

audioInput.onchange = (e) => {
	if (!audioInput.files[0]) {
  	return;
  }
  
  var fr = new FileReader();
  
  fr.onload = (e) => {
  	ctx.decodeAudioData(e.target.result).then((buf) => {
    	audioBuffer = buf;
      readyForEditing();
    }).catch((e) => {console.log(`Ooops! ${e.reason.message}`)});
  }
  fr.readAsArrayBuffer(audioInput.files[0]);
}

function ready() {
	ctx = new AudioContext();
  record();
}

function readyForEditing() {
	document.querySelector('#block2').style.display = "block";
  loadBuffer();
}

var audioOutput = document.querySelector('#output');

function loadBuffer() {
	wav = getAudioBlob();
  
  try {
  	URL.revokeObjectURL(wav);
  } catch(e) {}
  
  var url = URL.createObjectURL(wav);
  
  audioOutput.src = url;
}

var wav;

function getAudioBlob() {
  // Float32Array samples
  /*const [left, right] =  [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)]

  // interleaved
  const interleaved = new Float32Array(left.length + right.length)
  for (let src=0, dst=0; src < left.length; src++, dst+=2) {
    interleaved[dst] =   left[src]
    interleaved[dst+1] = right[src]
  }
  */
  var numChannels = audioBuffer.numberOfChannels;
  const interleaved = new Float32Array(audioBuffer.length * numChannels);
  for (var i = 0; i < interleaved.length; i++) {
    interleaved[i] = audioBuffer.getChannelData(i % numChannels)[Math.floor(i / numChannels)];
  }
  // get WAV file bytes and audio params of your audio source
  const wavBytes = getWavBytes(interleaved.buffer, {
    isFloat: true,       // floating point or 16-bit integer
    numChannels: numChannels,
    sampleRate: audioBuffer.sampleRate,
  });
  var output = new Blob([wavBytes], { type: 'audio/wav' });
  return output;
}

// Returns Uint8Array of WAV bytes
function getWavBytes(buffer, options) {
  const type = options.isFloat ? Float32Array : Uint16Array
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT

  const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);

  // prepend header, then add pcmBytes
  wavBytes.set(headerBytes, 0)
  wavBytes.set(new Uint8Array(buffer), headerBytes.length)

  return wavBytes
}

// adapted from https://gist.github.com/also/900023
// returns Uint8Array of WAV header bytes
function getWavHeader(options) {
  const numFrames =      options.numFrames
  const numChannels =    options.numChannels || 2
  const sampleRate =     options.sampleRate || 44100
  const bytesPerSample = options.isFloat? 4 : 2
  const format =         options.isFloat? 3 : 1

  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign

  const buffer = new ArrayBuffer(44)
  const dv = new DataView(buffer)

  let p = 0

  function writeString(s) {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i))
    }
    p += s.length
  }

  function writeUint32(d) {
    dv.setUint32(p, d, true)
    p += 4
  }

  function writeUint16(d) {
    dv.setUint16(p, d, true)
    p += 2
  }

  writeString('RIFF')              // ChunkID
  writeUint32(dataSize + 36)       // ChunkSize
  writeString('WAVE')              // Format
  writeString('fmt ')              // Subchunk1ID
  writeUint32(16)                  // Subchunk1Size
  writeUint16(format)              // AudioFormat https://i.sstatic.net/BuSmb.png
  writeUint16(numChannels)         // NumChannels
  writeUint32(sampleRate)          // SampleRate
  writeUint32(byteRate)            // ByteRate
  writeUint16(blockAlign)          // BlockAlign
  writeUint16(bytesPerSample * 8)  // BitsPerSample
  writeString('data')              // Subchunk2ID
  writeUint32(dataSize)            // Subchunk2Size

  return new Uint8Array(buffer)
}

var recordButton = document.querySelector('#record');
var stopButton = document.querySelector('#stop');

var mediaRecorder;

function record() {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
      	mediaRecorder = new MediaRecorder(stream);
        
        /*
        recordButton.onclick = () => {
          mediaRecorder.start();
          console.log(mediaRecorder.state);
          console.log("recorder started");
          recordButton.style.background = "red";
          recordButton.style.color = "black";
        };
        */
        
        recordButton.onclick = () => {
          if (mediaRecorder.state == "inactive") {
            mediaRecorder.start();
            recordButton.style.background = "red";
            recordButton.style.color = "black";
            recordButton.innerText = "Stop";
          } else if (mediaRecorder.state == "recording") {
            mediaRecorder.stop();
            recordButton.style.background = "";
            recordButton.style.color = "";
            recordButton.innerText = "Record";
          }
        };
        
        onkeydown = (e) => {
          if (e.code == "Space") {
            if (mediaRecorder.state == "inactive") {
              mediaRecorder.start();
              recordButton.style.background = "red";
              recordButton.style.color = "black";
              recordButton.innerText = "Stop";
            }
          }
        };
        
        onkeyup = (e) => {
          if (e.code == "Space") {
            if (mediaRecorder.state == "recording") {
              mediaRecorder.stop();
              recordButton.style.background = "";
              recordButton.style.color = "";
              recordButton.innerText = "Record";
            }
          }
        };
        
        let chunks = [];
				
        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };
        
        /*
        stopButton.onclick = () => {
          mediaRecorder.stop();
          console.log(mediaRecorder.state);
          console.log("recorder stopped");
          recordButton.style.background = "";
          recordButton.style.color = "";
        };
        */
        mediaRecorder.onstop = (e) => {
          console.log("recorder stopped");
					
          const blob = new Blob(chunks, { type: "audio/wav" });
          chunks = [];
          blob.arrayBuffer()
            .then((buff) => ctx.decodeAudioData(buff))
            .then((buff2) => {
              audioBuffer = buff2;
              readyForEditing();
            });
        };
      })
      .catch((err) => {
        console.error(`The following getUserMedia error occurred: ${err}`);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }
}
