// AI Proctoring — face-api.js (face/gaze) + COCO-SSD (phone, person, gadgets)

const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// Electronic gadgets COCO-SSD can detect
const GADGET_CLASSES = ['cell phone', 'laptop', 'remote', 'keyboard', 'mouse', 'tablet'];

class Proctor {
  constructor(videoEl, canvasEl, violationLogger) {
    this.video  = videoEl;
    this.canvas = canvasEl;
    this.logger = violationLogger;
    this.running = false;

    this._noFaceCount   = 0;
    this._lookAwayCount = 0;
    this._cocoModel     = null;
    this._intervalId    = null;
    this._faceApiReady  = false;
    this._cocoReady     = false;
  }

  async init() {
    const results = await Promise.allSettled([
      this._loadFaceApi(),
      this._loadCoco()
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Model ${i === 0 ? 'face-api' : 'coco-ssd'} failed:`, r.reason);
      }
    });

    if (!this._faceApiReady && !this._cocoReady) {
      throw new Error('All AI models failed to load');
    }

    console.log(`Proctor ready — face-api:${this._faceApiReady} coco:${this._cocoReady}`);
  }

  async _loadFaceApi() {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);
    this._faceApiReady = true;
    console.log('face-api models loaded');
  }

  async _loadCoco() {
    if (typeof cocoSsd === 'undefined') throw new Error('cocoSsd not available');
    // Use mobilenet_v2 — better accuracy for phones/objects
    this._cocoModel = await cocoSsd.load({ base: 'mobilenet_v2' });
    this._cocoReady = true;
    console.log('COCO-SSD model loaded');
  }

  start() {
    this.running = true;
    // Run every 1.5s for more responsive detection
    this._intervalId = setInterval(() => this._detect(), 1500);
  }

  stop() {
    this.running = false;
    clearInterval(this._intervalId);
  }

  async _detect() {
    if (!this.running || this.video.readyState < 2) return;

    // Set canvas to actual video resolution for accurate drawing
    this.canvas.width  = this.video.videoWidth  || 640;
    this.canvas.height = this.video.videoHeight || 480;
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const dims = { width: this.canvas.width, height: this.canvas.height };

    // Run both in parallel
    const [faceResult, cocoResult] = await Promise.allSettled([
      this._faceApiReady
        ? faceapi.detectAllFaces(this.video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
          ).withFaceLandmarks(true)
        : Promise.resolve([]),
      this._cocoReady
        ? this._cocoModel.detect(this.video, 20, 0.35) // max 20 objects, 35% confidence
        : Promise.resolve([])
    ]);

    const faceDetections = faceResult.status === 'fulfilled' ? faceResult.value : [];
    const cocoDetections = cocoResult.status === 'fulfilled' ? cocoResult.value : [];

    // Draw face boxes
    if (faceDetections.length > 0) {
      faceapi.matchDimensions(this.canvas, dims);
      const resized = faceapi.resizeResults(faceDetections, dims);
      faceapi.draw.drawDetections(this.canvas, resized);
    }

    // Draw COCO boxes
    this._drawCocoBoxes(ctx, cocoDetections);

    // Run violation checks
    this._checkFaces(faceDetections);
    this._checkObjects(cocoDetections);
    this._updateStatus(faceDetections.length, cocoDetections);
  }

  _checkFaces(detections) {
    const count = detections.length;

    if (count === 0) {
      this._noFaceCount++;
      if (this._noFaceCount >= 2) {
        this.logger.record('NO_FACE', 'No face detected in frame');
      }
    } else {
      this._noFaceCount = 0;
    }

    if (count > 1) {
      this.logger.record('MULTIPLE_FACES', `${count} faces detected in frame`);
    }

    if (count === 1) {
      const lm  = detections[0].landmarks;
      const nose = lm.getNose()[3];
      const box  = detections[0].detection.box;
      const offsetRatio = Math.abs(nose.x - (box.x + box.width / 2)) / box.width;
      if (offsetRatio > 0.25) {
        this._lookAwayCount++;
        if (this._lookAwayCount >= 2) {
          this.logger.record('LOOKING_AWAY', `Gaze offset: ${offsetRatio.toFixed(2)}`);
          this._lookAwayCount = 0;
        }
      } else {
        this._lookAwayCount = 0;
      }
    }
  }

  _checkObjects(detections) {
    // Phone or any electronic gadget
    const gadgets = detections.filter(d =>
      GADGET_CLASSES.includes(d.class) && d.score > 0.35
    );

    if (gadgets.length > 0) {
      const top = gadgets[0];
      this.logger.record('MOBILE_DETECTED',
        `${top.class} detected (${(top.score * 100).toFixed(0)}% confidence)`);
    }

    // Extra person — COCO detects persons, if >1 someone else is present
    const persons = detections.filter(d => d.class === 'person' && d.score > 0.50);
    if (persons.length > 1) {
      this.logger.record('EXTRA_PERSON',
        `${persons.length} persons detected in frame`);
    }
  }

  _drawCocoBoxes(ctx, detections) {
    const colorMap = {
      'cell phone': '#ef4444',
      'laptop':     '#ef4444',
      'remote':     '#ef4444',
      'keyboard':   '#f97316',
      'mouse':      '#f97316',
      'person':     '#f59e0b',
    };

    detections.forEach(d => {
      if (d.score < 0.35) return;
      const color = colorMap[d.class] || '#a78bfa';
      const [x, y, w, h] = d.bbox;

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Label background
      const label = `${d.class} ${(d.score * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px sans-serif';
      const tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 18, tw, 18);

      // Label text
      ctx.fillStyle = '#000';
      ctx.fillText(label, x + 4, y - 4);
    });
  }

  _updateStatus(faceCount, cocoDetections) {
    const status = document.getElementById('cam-status');
    if (!status) return;

    const gadgets = cocoDetections.filter(d =>
      GADGET_CLASSES.includes(d.class) && d.score > 0.35
    );
    const persons = cocoDetections.filter(d => d.class === 'person' && d.score > 0.50);

    if (gadgets.length > 0) {
      status.textContent = `🚨 ${gadgets[0].class} detected`;
      status.className   = 'bad';
    } else if (persons.length > 1) {
      status.textContent = `🚨 ${persons.length} persons in frame`;
      status.className   = 'bad';
    } else if (faceCount === 0) {
      status.textContent = '● No face detected';
      status.className   = 'bad';
    } else if (faceCount > 1) {
      status.textContent = `⚠️ ${faceCount} faces`;
      status.className   = 'warn';
    } else {
      status.textContent = '● Face detected';
      status.className   = 'ok';
    }
  }
}
