/* =====================================================
   THE OBSERVER EFFECT - Observer JavaScript
   Updated: Curatorial text moves below fold on consent
   ===================================================== */

// =====================================================
// STATE
// =====================================================

const state = {
    startTime: Date.now(),
    mouseX: 0,
    mouseY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    mouseMovements: 0,
    clicks: 0,
    scrolls: 0,
    keystrokes: 0,
    lastActivity: Date.now(),
    webcamActive: false,
    microphoneActive: false,
    faceApiLoaded: false,
    observations: [],
    // Face detection state
    lastFaceDetection: null,
    eyeColor: null,
    hairColor: null,
    backgroundColor: null,
    gazeDirection: 'CENTER',
    detectionCanvas: null,
    videoStream: null,
    // Audio state
    audioContext: null,
    analyser: null,
    microphone: null,
    audioDataArray: null,
    // Wave effect state
    waves: [],
    waveCanvas: null,
    waveCtx: null
};

// =====================================================
// DOM ELEMENTS
// =====================================================

const elements = {
    webcam: document.getElementById('webcam'),
    webcamContainer: document.getElementById('webcam-container'),
    modal: document.getElementById('camera-modal'),
    allowBtn: document.getElementById('allow-camera'),
    denyBtn: document.getElementById('deny-camera'),
    ticker: document.getElementById('ticker-content'),
    logEntries: document.getElementById('log-entries'),
    userIP: document.getElementById('user-ip'),
    userLocation: document.getElementById('user-location'),
    userDevice: document.getElementById('user-device'),
    userBrowser: document.getElementById('user-browser'),
    userScreen: document.getElementById('user-screen'),
    timeOnPage: document.getElementById('time-on-page'),
    // AI detection elements
    userEyeColor: document.getElementById('user-eye-color'),
    userHairColor: document.getElementById('user-hair-color'),
    userBackground: document.getElementById('user-background'),
    userGaze: document.getElementById('user-gaze'),
    // Two eyes
    gazeEyes: document.getElementById('gaze-eyes'),
    leftIris: document.querySelector('.left-eye .eye-iris'),
    rightIris: document.querySelector('.right-eye .eye-iris'),
    // Audio elements
    waveformCanvas: document.getElementById('waveform-canvas'),
    audioStatus: document.getElementById('audio-status'),
    levelBar: document.getElementById('level-bar'),
    levelValue: document.getElementById('level-value'),
    // Wave canvas
    waveCanvas: document.getElementById('wave-canvas')
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initSurveillance();
    setupEventListeners();
    startTimers();
    collectDeviceInfo();
    fetchIPInfo();
    initFaceApi();
    initWaveCanvas();
});

function initSurveillance() {
    addObservation('SYSTEM', 'Observation protocols initialized');
    addObservation('SYSTEM', 'Subject has entered the exhibition');
}

async function initFaceApi() {
    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        ]);
        
        state.faceApiLoaded = true;
        addObservation('AI', 'Face detection models loaded');
    } catch (err) {
        console.log('Face-api.js loading error:', err);
        addObservation('AI', 'Face detection unavailable - using fallback');
    }
}

// =====================================================
// WAVE CANVAS INITIALIZATION
// =====================================================

function initWaveCanvas() {
    state.waveCanvas = elements.waveCanvas;
    state.waveCtx = state.waveCanvas.getContext('2d');
    
    resizeWaveCanvas();
    window.addEventListener('resize', resizeWaveCanvas);
    
    animateWaves();
}

function resizeWaveCanvas() {
    state.waveCanvas.width = window.innerWidth;
    state.waveCanvas.height = window.innerHeight;
}

// =====================================================
// CAMERA & MICROPHONE FUNCTIONALITY
// =====================================================

function setupEventListeners() {
    elements.allowBtn.addEventListener('click', requestMediaAccess);
    elements.denyBtn.addEventListener('click', denyCamera);

    document.addEventListener('mousemove', trackMouse);
    document.addEventListener('click', trackClick);
    document.addEventListener('scroll', trackScroll);
    document.addEventListener('keydown', trackKeypress);
    document.addEventListener('visibilitychange', trackVisibility);
    window.addEventListener('resize', trackResize);
}

async function requestMediaAccess() {
    elements.modal.classList.add('hidden');
    
    // Request camera
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        elements.webcam.srcObject = videoStream;
        state.videoStream = videoStream;
        state.webcamActive = true;
        
        // Add camera-active class to body to trigger curatorial text animation
        document.body.classList.add('camera-active');
        
        elements.webcam.onloadedmetadata = () => {
            elements.webcam.play();
            createDetectionCanvas();
            
            if (state.faceApiLoaded) {
                startFaceDetection();
            } else {
                startBasicAnalysis();
            }
            
            elements.gazeEyes.classList.add('active');
        };
        
        addObservation('CAMERA', 'Subject has consented to visual observation');
        addObservation('AI', 'Initiating facial analysis protocols...');
        addObservation('SYSTEM', 'Curatorial context deferred - subject is the primary exhibit');
        
    } catch (err) {
        console.log('Camera access denied:', err);
        addObservation('CAMERA', 'Camera access denied');
    }
    
    // Request microphone
    try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        initAudioAnalysis(audioStream);
        state.microphoneActive = true;
        elements.audioStatus.textContent = 'ACTIVE';
        elements.audioStatus.classList.add('active');
        addObservation('AUDIO', 'Microphone access granted - listening...');
    } catch (err) {
        console.log('Microphone access denied:', err);
        elements.audioStatus.textContent = 'DENIED';
        addObservation('AUDIO', 'Microphone access denied');
    }
    
    updateTicker('MEDIA ACCESS GRANTED — VISUAL & AUDIO OBSERVATION ACTIVE — YOU ARE THE EXHIBITION');
}

function denyCamera() {
    elements.modal.classList.add('hidden');
    document.body.classList.add('camera-denied');
    // Don't add camera-active, so curatorial text stays at top
    
    elements.userEyeColor.textContent = 'NO VISUAL';
    elements.userHairColor.textContent = 'NO VISUAL';
    elements.userBackground.textContent = 'NO VISUAL';
    elements.userGaze.textContent = 'NO VISUAL';
    elements.audioStatus.textContent = 'NO ACCESS';
    
    addObservation('CAMERA', 'Subject denied observation');
    addObservation('SYSTEM', 'Continuing with behavioral surveillance only');
    updateTicker('MEDIA ACCESS DENIED — BEHAVIORAL OBSERVATION CONTINUES');
}

function createDetectionCanvas() {
    state.detectionCanvas = document.createElement('canvas');
    state.detectionCanvas.width = elements.webcam.videoWidth || 640;
    state.detectionCanvas.height = elements.webcam.videoHeight || 480;
}

// =====================================================
// AUDIO ANALYSIS & WAVEFORM
// =====================================================

function initAudioAnalysis(stream) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    
    state.microphone = state.audioContext.createMediaStreamSource(stream);
    state.microphone.connect(state.analyser);
    
    const bufferLength = state.analyser.frequencyBinCount;
    state.audioDataArray = new Uint8Array(bufferLength);
    
    // Setup waveform canvas
    const canvas = elements.waveformCanvas;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    
    drawWaveform();
}

function drawWaveform() {
    if (!state.analyser) return;
    
    requestAnimationFrame(drawWaveform);
    
    state.analyser.getByteTimeDomainData(state.audioDataArray);
    
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff41';
    ctx.beginPath();
    
    const sliceWidth = width / state.audioDataArray.length;
    let x = 0;
    
    for (let i = 0; i < state.audioDataArray.length; i++) {
        const v = state.audioDataArray[i] / 128.0;
        const y = (v * height) / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Calculate and display audio level
    let sum = 0;
    for (let i = 0; i < state.audioDataArray.length; i++) {
        const val = (state.audioDataArray[i] - 128) / 128;
        sum += val * val;
    }
    const rms = Math.sqrt(sum / state.audioDataArray.length);
    const db = 20 * Math.log10(rms + 0.0001);
    const normalizedLevel = Math.min(100, Math.max(0, (db + 60) * 1.67));
    
    elements.levelBar.style.width = normalizedLevel + '%';
    elements.levelValue.textContent = Math.round(db) + ' dB';
    
    // Add to observations occasionally
    if (normalizedLevel > 50 && Math.random() < 0.01) {
        addObservation('AUDIO', `Sound spike detected: ${Math.round(db)} dB`);
    }
}

// =====================================================
// FACE DETECTION & EYE TRACKING
// =====================================================

async function startFaceDetection() {
    const detectFace = async () => {
        if (!state.webcamActive || !elements.webcam.videoWidth) {
            requestAnimationFrame(detectFace);
            return;
        }
        
        try {
            const detections = await faceapi.detectSingleFace(
                elements.webcam,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
            ).withFaceLandmarks(true);
            
            if (detections) {
                state.lastFaceDetection = detections;
                processFaceDetection(detections);
            } else {
                elements.userGaze.textContent = 'FACE NOT DETECTED';
                elements.gazeEyes.style.opacity = '0.3';
            }
        } catch (err) {
            console.log('Detection error:', err);
        }
        
        setTimeout(detectFace, 100);
    };
    
    detectFace();
    setInterval(analyzeColors, 2000);
}

function startBasicAnalysis() {
    setInterval(analyzeColors, 2000);
    addObservation('AI', 'Using basic color analysis mode');
}

function processFaceDetection(detection) {
    const landmarks = detection.landmarks;
    
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const leftEyeCenter = getCenterPoint(leftEye);
    const rightEyeCenter = getCenterPoint(rightEye);
    
    const nose = landmarks.getNose();
    const noseCenter = getCenterPoint(nose);
    
    const gazeDirection = estimateGaze(leftEyeCenter, rightEyeCenter, noseCenter, detection.detection.box);
    
    state.gazeDirection = gazeDirection;
    elements.userGaze.textContent = gazeDirection;
    
    moveGazeEyes(gazeDirection);
    elements.gazeEyes.style.opacity = '1';
}

function getCenterPoint(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
}

function estimateGaze(leftEye, rightEye, nose, faceBox) {
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;
    
    const offsetX = (nose.x - faceCenterX) / faceBox.width;
    const offsetY = (nose.y - faceCenterY) / faceBox.height;
    
    let horizontal = 'CENTER';
    let vertical = '';
    
    if (offsetX < -0.05) horizontal = 'LEFT';
    else if (offsetX > 0.05) horizontal = 'RIGHT';
    
    if (offsetY < -0.1) vertical = 'UP-';
    else if (offsetY > 0.1) vertical = 'DOWN-';
    
    const direction = vertical + horizontal;
    
    if (direction !== state.gazeDirection) {
        addObservation('GAZE', `Subject looking ${direction}`);
    }
    
    return direction || 'CENTER';
}

function moveGazeEyes(direction) {
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    let offsetX = 0;
    let offsetY = 0;
    const moveAmount = 180;
    
    if (direction.includes('LEFT')) offsetX = -moveAmount;
    if (direction.includes('RIGHT')) offsetX = moveAmount;
    if (direction.includes('UP')) offsetY = -moveAmount;
    if (direction.includes('DOWN')) offsetY = moveAmount;
    
    offsetX += (Math.random() - 0.5) * 20;
    offsetY += (Math.random() - 0.5) * 20;
    
    const eyeX = screenCenterX + offsetX - 67; // Half of eye pair width
    const eyeY = screenCenterY + offsetY - 25;
    
    elements.gazeEyes.style.left = `${eyeX}px`;
    elements.gazeEyes.style.top = `${eyeY}px`;
    
    // Move irises
    let irisX = 0;
    let irisY = 0;
    
    if (direction.includes('LEFT')) irisX = -6;
    if (direction.includes('RIGHT')) irisX = 6;
    if (direction.includes('UP')) irisY = -5;
    if (direction.includes('DOWN')) irisY = 5;
    
    if (elements.leftIris) {
        elements.leftIris.style.transform = `translate(${irisX}px, ${irisY}px)`;
    }
    if (elements.rightIris) {
        elements.rightIris.style.transform = `translate(${irisX}px, ${irisY}px)`;
    }
    
    // Random blink
    if (Math.random() < 0.025) {
        blinkEyes();
    }
}

function blinkEyes() {
    elements.gazeEyes.classList.add('blinking');
    setTimeout(() => elements.gazeEyes.classList.remove('blinking'), 150);
}

// Periodic blinking
setInterval(() => {
    if (state.webcamActive && Math.random() < 0.3) {
        blinkEyes();
    }
}, 3000);

// =====================================================
// WAVE EFFECT (REACTS TO MOVEMENT)
// =====================================================

function animateWaves() {
    if (!state.waveCtx) return;
    
    const ctx = state.waveCtx;
    const width = state.waveCanvas.width;
    const height = state.waveCanvas.height;
    
    // Clear with transparency
    ctx.clearRect(0, 0, width, height);
    
    // Update and draw waves
    for (let i = state.waves.length - 1; i >= 0; i--) {
        const wave = state.waves[i];
        
        wave.radius += wave.speed;
        wave.opacity -= 0.008;
        
        if (wave.opacity <= 0) {
            state.waves.splice(i, 1);
            continue;
        }
        
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 65, ${wave.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner ring
        if (wave.radius > 20) {
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 212, 255, ${wave.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    requestAnimationFrame(animateWaves);
}

function createWave(x, y) {
    state.waves.push({
        x: x,
        y: y,
        radius: 5,
        speed: 2 + Math.random() * 2,
        opacity: 0.6
    });
    
    // Limit total waves
    if (state.waves.length > 30) {
        state.waves.shift();
    }
}

// =====================================================
// COLOR ANALYSIS
// =====================================================

function analyzeColors() {
    if (!state.webcamActive || !state.detectionCanvas) return;
    
    const ctx = state.detectionCanvas.getContext('2d');
    const video = elements.webcam;
    
    ctx.drawImage(video, 0, 0, state.detectionCanvas.width, state.detectionCanvas.height);
    
    analyzeEyeColor(ctx);
    analyzeHairColor(ctx);
    analyzeBackground(ctx);
}

function analyzeEyeColor(ctx) {
    let eyeRegion;
    
    if (state.lastFaceDetection) {
        const landmarks = state.lastFaceDetection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const eyeCenter = getCenterPoint(leftEye);
        
        eyeRegion = ctx.getImageData(
            Math.max(0, eyeCenter.x - 10),
            Math.max(0, eyeCenter.y - 5),
            20, 10
        );
    } else {
        const w = state.detectionCanvas.width;
        const h = state.detectionCanvas.height;
        eyeRegion = ctx.getImageData(w * 0.35, h * 0.3, w * 0.3, h * 0.1);
    }
    
    const dominantColor = getDominantColor(eyeRegion.data);
    const eyeColorName = classifyEyeColor(dominantColor);
    
    if (eyeColorName !== state.eyeColor) {
        state.eyeColor = eyeColorName;
        elements.userEyeColor.textContent = eyeColorName;
        addObservation('AI', `Eye color detected: ${eyeColorName}`);
    }
}

function analyzeHairColor(ctx) {
    const w = state.detectionCanvas.width;
    const h = state.detectionCanvas.height;
    
    let hairRegion;
    
    if (state.lastFaceDetection) {
        const box = state.lastFaceDetection.detection.box;
        hairRegion = ctx.getImageData(
            Math.max(0, box.x),
            Math.max(0, box.y - 50),
            box.width,
            40
        );
    } else {
        hairRegion = ctx.getImageData(w * 0.25, h * 0.05, w * 0.5, h * 0.15);
    }
    
    const dominantColor = getDominantColor(hairRegion.data);
    const hairColorName = classifyHairColor(dominantColor);
    
    if (hairColorName !== state.hairColor) {
        state.hairColor = hairColorName;
        elements.userHairColor.textContent = hairColorName;
        addObservation('AI', `Hair color detected: ${hairColorName}`);
    }
}

function analyzeBackground(ctx) {
    const w = state.detectionCanvas.width;
    const h = state.detectionCanvas.height;
    
    const leftEdge = ctx.getImageData(0, h * 0.2, w * 0.15, h * 0.6);
    const rightEdge = ctx.getImageData(w * 0.85, h * 0.2, w * 0.15, h * 0.6);
    
    const combinedData = new Uint8ClampedArray(leftEdge.data.length + rightEdge.data.length);
    combinedData.set(leftEdge.data);
    combinedData.set(rightEdge.data, leftEdge.data.length);
    
    const dominantColor = getDominantColor(combinedData);
    const brightness = (dominantColor.r + dominantColor.g + dominantColor.b) / 3;
    
    let environment = '';
    
    if (brightness < 50) environment = 'DARK ENVIRONMENT';
    else if (brightness < 100) environment = 'DIM LIGHTING';
    else if (brightness < 180) environment = 'NORMAL LIGHTING';
    else environment = 'BRIGHT ENVIRONMENT';
    
    const colorName = classifyBackgroundColor(dominantColor);
    environment = `${colorName} / ${environment}`;
    
    if (environment !== state.backgroundColor) {
        state.backgroundColor = environment;
        elements.userBackground.textContent = environment;
        addObservation('AI', `Environment: ${environment}`);
    }
}

function getDominantColor(pixels) {
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < pixels.length; i += 4) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
        count++;
    }
    
    return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count)
    };
}

function classifyEyeColor(color) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    const { h, s, l } = hsl;
    
    if (l < 0.2) return 'DARK BROWN';
    if (s < 0.15) return l < 0.4 ? 'DARK GRAY' : 'GRAY';
    if (h >= 180 && h <= 260) return l < 0.4 ? 'DARK BLUE' : l > 0.6 ? 'LIGHT BLUE' : 'BLUE';
    if (h >= 80 && h <= 160) return color.b > color.g * 0.7 ? 'HAZEL' : 'GREEN';
    if (h >= 20 && h <= 50) return l > 0.5 ? 'AMBER' : l > 0.35 ? 'LIGHT BROWN' : 'BROWN';
    return 'BROWN';
}

function classifyHairColor(color) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    const { h, s, l } = hsl;
    
    if (l < 0.15) return 'BLACK';
    if (l < 0.25) return 'DARK BROWN';
    if (l > 0.7 && s < 0.3) return 'GRAY/WHITE';
    if (l > 0.6) return 'BLONDE';
    if (h >= 0 && h <= 30 && s > 0.3) return 'RED/AUBURN';
    if (l < 0.4) return 'BROWN';
    return 'LIGHT BROWN';
}

function classifyBackgroundColor(color) {
    const hsl = rgbToHsl(color.r, color.g, color.b);
    
    if (hsl.s < 0.1) {
        if (hsl.l < 0.3) return 'DARK';
        if (hsl.l > 0.7) return 'LIGHT';
        return 'NEUTRAL';
    }
    
    const h = hsl.h;
    if (h < 30) return 'WARM TONES';
    if (h < 90) return 'YELLOW/GREEN';
    if (h < 150) return 'GREEN/CYAN';
    if (h < 210) return 'BLUE';
    if (h < 270) return 'PURPLE';
    if (h < 330) return 'PINK/MAGENTA';
    return 'RED/WARM';
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s, l };
}

// =====================================================
// DEVICE & LOCATION INFO
// =====================================================

function collectDeviceInfo() {
    elements.userBrowser.textContent = detectBrowser();
    elements.userDevice.textContent = detectDevice();
    elements.userScreen.textContent = `${window.screen.width}x${window.screen.height}`;
    
    addObservation('DEVICE', `Browser: ${detectBrowser()}, Screen: ${window.screen.width}x${window.screen.height}`);
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
}

function detectDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Win/i.test(ua)) return 'Windows';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
}

async function fetchIPInfo() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.ip) {
            const ipParts = data.ip.split('.');
            elements.userIP.textContent = `${ipParts[0]}.${ipParts[1]}.XXX.XXX`;
        }
        
        if (data.city && data.country_name) {
            elements.userLocation.textContent = `${data.city}, ${data.region}, ${data.country_name}`;
            addObservation('LOCATION', `Subject located in ${data.city}, ${data.country_name}`);
        }
    } catch (err) {
        elements.userIP.textContent = 'MASKED';
        elements.userLocation.textContent = 'UNDISCLOSED';
    }
}

// =====================================================
// BEHAVIOR TRACKING
// =====================================================

function trackMouse(e) {
    state.lastMouseX = state.mouseX;
    state.lastMouseY = state.mouseY;
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.mouseMovements++;
    state.lastActivity = Date.now();
    
    // Create wave effect on movement
    if (state.mouseMovements % 8 === 0) {
        createWave(e.clientX, e.clientY);
    }
    
    if (state.mouseMovements % 50 === 0) {
        const dx = state.mouseX - state.lastMouseX;
        const direction = dx > 0 ? 'RIGHT' : 'LEFT';
        addObservation('MOUSE', `Cursor moved ${direction} — Position: ${state.mouseX}, ${state.mouseY}`);
    }
}

function trackClick(e) {
    state.clicks++;
    state.lastActivity = Date.now();
    
    // Create wave burst on click
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createWave(e.clientX, e.clientY), i * 100);
    }
    
    let description = `Click detected on ${e.target.tagName.toLowerCase()}`;
    
    if (e.target.closest('.artwork-card')) {
        const card = e.target.closest('.artwork-card');
        const title = card.querySelector('.artwork-title')?.textContent || 'artwork';
        description = `Subject examining: "${title}"`;
    }
    
    addObservation('CLICK', description);
}

function trackScroll() {
    state.scrolls++;
    state.lastActivity = Date.now();
    
    // Create waves on scroll
    createWave(window.innerWidth / 2, window.innerHeight / 2);
    
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    
    if (state.scrolls % 5 === 0) {
        addObservation('SCROLL', `${scrollPercent}% through exhibition`);
    }
}

function trackKeypress(e) {
    state.keystrokes++;
    state.lastActivity = Date.now();
    
    // Wave on keypress
    createWave(window.innerWidth / 2, window.innerHeight / 2);
}

function trackVisibility() {
    if (document.hidden) {
        addObservation('ATTENTION', 'Subject has left the exhibition tab');
        updateTicker('SUBJECT HAS DIVERTED ATTENTION — TAB INACTIVE');
    } else {
        addObservation('ATTENTION', 'Subject has returned');
        updateTicker('SUBJECT HAS RETURNED — OBSERVATION RESUMED');
    }
}

function trackResize() {
    addObservation('WINDOW', `Viewport resized to ${window.innerWidth}x${window.innerHeight}`);
    resizeWaveCanvas();
}

// =====================================================
// OBSERVATION LOG & TICKER
// =====================================================

function addObservation(type, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="action">${type}:</span> ${message}`;
    
    elements.logEntries.appendChild(entry);
    elements.logEntries.scrollTop = elements.logEntries.scrollHeight;
    
    while (elements.logEntries.children.length > 50) {
        elements.logEntries.removeChild(elements.logEntries.firstChild);
    }
    
    state.observations.push({ timestamp, type, message });
}

function updateTicker(message) {
    elements.ticker.innerHTML = [message, `MOVEMENTS: ${state.mouseMovements}`, `CLICKS: ${state.clicks}`, 'YOU ARE BEING OBSERVED']
        .map(msg => `<span class="ticker-item">${msg}</span>`).join('');
}

function generateTickerContent() {
    const messages = [];
    const timeOnPage = Math.floor((Date.now() - state.startTime) / 1000);
    
    if (timeOnPage > 60) messages.push(`OBSERVED FOR ${Math.floor(timeOnPage / 60)} MINUTES`);
    
    messages.push(`MOUSE MOVEMENTS: ${state.mouseMovements}`);
    messages.push(`CLICKS: ${state.clicks}`);
    
    if (state.eyeColor) messages.push(`EYE COLOR: ${state.eyeColor}`);
    if (state.gazeDirection) messages.push(`GAZE: ${state.gazeDirection}`);
    if (state.microphoneActive) messages.push('AUDIO MONITORING ACTIVE');
    
    const philosophical = [
        'OBSERVATION CREATES REALITY',
        'YOU ARE WATCHING — YOU ARE BEING WATCHED',
        'THE SCREEN IS NOT NEUTRAL',
        'IDENTITY IS PERFORMED — IDENTITY IS CONSUMED',
        'YOU ARE THE EXHIBITION'
    ];
    messages.push(philosophical[Math.floor(Math.random() * philosophical.length)]);
    
    elements.ticker.innerHTML = messages.map(msg => `<span class="ticker-item">${msg}</span>`).join('');
}

// =====================================================
// TIMERS
// =====================================================

function startTimers() {
    setInterval(updateTimeOnPage, 1000);
    setInterval(generateTickerContent, 10000);
    setTimeout(generateTickerContent, 3000);
}

function updateTimeOnPage() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    
    elements.timeOnPage.textContent = `${hours}:${minutes}:${seconds}`;
}

// =====================================================
// CONSOLE MESSAGE
// =====================================================

console.log(`
%c ◉ THE OBSERVER EFFECT ◉ 
%c You found the console. Even here, you are being watched.
%c "Observation creates reality."
%c Curated by Dasean
`,
'color: #ff3333; font-size: 20px; font-weight: bold;',
'color: #00ff41; font-size: 12px;',
'color: #ffcc00; font-style: italic;',
'color: #00d4ff;'
);