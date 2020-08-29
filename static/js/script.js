class VoiceRecorder {
  constructor() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log("getUserMedia supported")
    } else {
      console.log("getUserMedia is not supported on your browser!")
    }

    var config = {
      apiKey: "AIzaSyBjFT_idBtwpI4agq0BwV_QKjAY99MJR78",
      authDomain: "hologram-covid-19.firebaseapp.com",
      databaseURL: "https://hologram-covid-19.firebaseio.com",
      projectId: "hologram-covid-19",
      storageBucket: "hologram-covid-19.appspot.com",
      messagingSenderId: "369000143558",
      appId: "1:369000143558:web:1e200db940b5e4735115c7"
    };
    firebase.initializeApp(config);
  
    // Get a reference to the database service
    this.database = firebase.database();

    $('audio').get(0).addEventListener("ended", function(){
      $('audio').get(0).currentTime = 0;
      firebase.database().ref().update({
        "lastUpdate": 0
      });
    });

    this.mediaRecorder
    this.stream
    this.chunks = []
    this.isRecording = false

    this.on, this.off, this.mic, this.amp, this.hover;
    this.listening = false;

    this.recording = false;
    this.leftchannel = []
    this.rightchannel = []
    this.recordingLength = 0
    this.tested = false;

    this.recorderRef = document.querySelector("#recorder")
    this.canvas = document.querySelector('canvas');
    // this.canvas.id('canvas');
    // this.canvas.parent('microphone');
    this.canvasCtx = this.canvas.getContext("2d");
    this.visualSelect = document.querySelector('#visSelect');

    this.visual = this.visualize.bind(this)

    $('#loading-outer').on("click", this.startRecording.bind(this));



    // $('#button').on('touchend mouseup', this.stopRecording.bind(this));

    this.constraints = {
      audio: true,
      video: false
    }

  }

  handleSuccess(stream) {
    this.stream = stream
    this.stream.oninactive = () => {
      console.log("Stream ended!")
    };
    this.recorderRef.srcObject = this.stream
    this.mediaRecorder = new MediaRecorder(this.stream)
    this.mediaRecorder.ondataavailable = this.onMediaRecorderDataAvailable.bind(this)
    this.mediaRecorder.onstop = this.onMediaRecorderStop.bind(this)
    this.recorderRef.play()
    this.mediaRecorder.start()
  }

  handleError(error) {
    console.log("navigator.getUserMedia error: ", error)
  }

  onMediaRecorderDataAvailable(e) { this.chunks.push(e.data) }

  onMediaRecorderStop(e) {
    const blob = new Blob(this.chunks, { 'type': 'audio/ogg; codecs=opus' })
    const audioURL = window.URL.createObjectURL(blob)
    var httpRequest = new XMLHttpRequest();
    httpRequest.open("POST", "http://localhost:5000/", true);
    httpRequest.send(blob);
    this.chunks = []
    this.stream.getAudioTracks().forEach(track => track.stop())
    this.stream = null
    delete this.leftchannel
    delete this.rightchannel
    delete this.recordingLength
    this.leftchannel = []
    this.rightchannel = []
    this.recordingLength = 0
  }

  async startRecording() {
    // and if microphone is enabled... *
    if (this.listening === true) {
      $("#loading-outer").css("background-color", "#0cb44f");
      $("#loading-inner").css("background-color", "#0cb44f");
      // * stop listening
      this.listening = false;
      this.recording = false

      var recordingLength = this.leftchannel.length * 2048

      // we flat the left and right channels down
      const leftBuffer = mergeBuffers(this.leftchannel, recordingLength);
      const rightBuffer = mergeBuffers(this.rightchannel, recordingLength);
      // console.log("kkkkkkk", leftBuffer)
      // we interleave both channels together
      const interleaved = interleave(leftBuffer, rightBuffer);
      this.data = interleaved

      ///////////// WAV Encode /////////////////
      // from http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
      //

      // we create our wav file
      const buffer = new ArrayBuffer(44 + interleaved.length * 2);
      const view = new DataView(buffer);

      // RIFF chunk descriptor
      writeUTFBytes(view, 0, 'RIFF');
      view.setUint32(4, 44 + interleaved.length * 2, true);
      writeUTFBytes(view, 8, 'WAVE');
      // FMT sub-chunk
      writeUTFBytes(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      // stereo (2 channels)
      view.setUint16(22, 2, true);
      view.setUint32(24, this.sampleRate, true);
      view.setUint32(28, this.sampleRate * 4, true);
      view.setUint16(32, 4, true);
      view.setUint16(34, 16, true);
      // data sub-chunk
      writeUTFBytes(view, 36, 'data');
      view.setUint32(40, interleaved.length * 2, true);

      // write the PCM samples
      let lng = interleaved.length;
      let index = 44;
      this.volume = 1;
      for (let i = 0; i < lng; i++) {
        view.setInt16(index, interleaved[i] * (0x7FFF * this.volume), true);
        index += 2;
      }
      // our final binary blob
      const blob = new Blob([view], { type: 'audio/wav' });

      // const audioUrl = URL.createObjectURL(blob);

      jQuery.ajax({
        url: '/',
        type: 'POST',
        contentType: false,
        processData: false,
        data: blob,
        success: function (data) {
          firebase.database().ref().update({
            "lastUpdate": 1
          });
          $('audio #source').attr('src', data);
          $('audio').get(0).load();
          $('audio').get(0).play();
        }
      });
      // and if microphone is disabled... *
    } else {
      $("#loading-outer").css("background-color", "#e41558");
      $("#loading-inner").css("background-color", "#e41558");
      // alert("test3")
      // * start listening
      this.listening = true;
      var leftchan = []
      var rightchan = []
      var recordingLen = 0
      this.recordingLength = 0

      this.recording = true

      let context = new AudioContext({sampleRate: 44100});
      this.sampleRate = context.sampleRate;

      // creates a gain node
      this.volume = context.createGain();
      let stream = await getStream();
      // creates an audio node from the microphone incoming stream
      let audioInput = context.createMediaStreamSource(stream);

      // Create analyser
      this.analyser = context.createAnalyser();

      // connect audio input to the analyser
      audioInput.connect(this.analyser);

      // connect analyser to the volume control
      // analyser.connect(volume);

      let bufferSize = 2048;
      let recorder = context.createScriptProcessor(bufferSize, 2, 2);

      // we connect the volume control to the processor
      // volume.connect(recorder);

      this.analyser.connect(recorder);

      // finally connect the processor to the output
      recorder.connect(context.destination);
      recorder.onaudioprocess = function (e) {
        // Check 
        if (!this.recording) return;
        this.left = e.inputBuffer.getChannelData(0);
        this.right = e.inputBuffer.getChannelData(1);

        if (!this.tested) {
          this.tested = true;
          // if this reduces to 0 we are not getting any sound
          if (!this.left.reduce((a, b) => a + b)) {
            // clean up;
            stop();
            stream.getTracks().forEach(function (track) {
              track.stop();
            });
            context.close();
          }
        }
        // we clone the samples
        leftchan.push(new Float32Array(this.left));
        rightchan.push(new Float32Array(this.right));

        // console.log("lllllllll" + this.recordingLength)
        this.recordingLength += bufferSize;
        // console.log("lllllllll" + this.recordingLength)

      }.bind(this);
      // console.log(recordingLen)
      this.leftchannel = leftchan
      this.rightchannel = rightchan
      // this.recordingLength = recordingLen
      // this.visual()
    }


  }

  visualize() {
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    // this.canvasCtx.translate(0.5, 0.5);
    let WIDTH = this.canvas.width;
    let HEIGHT = this.canvas.height;
    // canvas background color
    // background('#161616');

    // microphone button
    // --------------------------
    // distance between mouse position and inner ellipse
    var d = dist(mouseX, mouseY, windowWidth / 2, windowHeight / 2);

    // if distance between mouse position is less than inner ellipse radius... *
    if (d < 35) {
      // * set hover status to true
      hover = true;
      // if distance between mouse position is greater than inner ellipse radius... *
    } else {
      // * set hover status to false
      hover = false;
    }

    // if hover status is true... *
    if (hover === true) {
      // * display pointer cursor
      cursor(HAND);
      // if hover status is false... *
    } else {
      // * display default cursor
      cursor(ARROW);
    }

    this.analyser.fftSize = 2048;
    var bufferLength = this.analyser.fftSize;
    var dataArray = new Uint8Array(bufferLength);


    this.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    var draw = function () {
      this.drawVisual = requestAnimationFrame(draw);
      this.analyser.getByteTimeDomainData(dataArray);

      this.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      this.canvasCtx.lineWidth = 2;
      this.canvasCtx.fillStyle = '#222';
      this.canvasCtx.strokeStyle = "#fff";

      this.canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for (var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT / 2;

        if (i === 0) {
          this.canvasCtx.moveTo(x, y);
        } else {
          this.canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.canvasCtx.lineTo(this.canvas.width, this.canvas.height / 2);
      this.canvasCtx.stroke();

    }.bind(this);

    draw();

  }

}



function getStream(constraints) {
  if (!constraints) {
    constraints = { audio: true, video: false };
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}

function mergeBuffers(channelBuffer, recordingLength) {
  let result = new Float32Array(recordingLength);
  let offset = 0;
  let lng = channelBuffer.length;
  for (let i = 0; i < lng; i++) {
    let buffer = channelBuffer[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

function interleave(leftChannel, rightChannel) {
  let length = leftChannel.length + rightChannel.length;
  let result = new Float32Array(length);

  let inputIndex = 0;

  for (let index = 0; index < length;) {
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeUTFBytes(view, offset, string) {
  let lng = string.length;
  for (let i = 0; i < lng; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

const drawLineSegment = (ctx, x, y, width, isEven) => {
  ctx.lineWidth = 1; // how thick the line is
  ctx.strokeStyle = "#fff"; // what color our line is
  ctx.beginPath();
  y = isEven ? y : -y;
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y);
  ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);
  ctx.lineTo(x + width, 0);
  ctx.stroke();
};

const filterData = audioBuffer => {
  const rawData = audioBuffer // We only need to work with one channel of data
  const samples = 70; // Number of samples we want to have in our final data set
  const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
  const filteredData = [];
  for (let i = 0; i < samples; i++) {
    let blockStart = blockSize * i; // the location of the first sample in the block
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum = sum + Math.abs(rawData[blockStart + j]) // find the sum of all the samples in the block
    }
    filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
  }
  return filteredData;
}

const normalizeData = filteredData => {
  const multiplier = Math.pow(Math.max(...filteredData), -1);
  return filteredData.map(n => n * multiplier);
}

window.voiceRecorder = new VoiceRecorder()