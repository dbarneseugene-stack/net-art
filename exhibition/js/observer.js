/* =====================================================
   THE OBSERVER EFFECT - Observer JavaScript
   Surveillance, tracking, and AI visual analysis
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
    timeInactive: 0,
    lastActivity: Date.now(),
    webcamActive: false,
    faceApiLoaded: false,
    observations: [],
    // Face detection state
    lastFaceDetection: null,
    eyeColor: null,
    hairColor: null,
    backgroundColor: null,
    gazeDirection: 'CENTER',
    detectionCanvas: null,
    videoStream: null
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
    // New AI detection elements
    userEyeColor: document.getElementById('user-eye-color'),
    userHairColor: document.getElementById('user-hair-color'),
    userBackground: document.getElementById('user-background'),
    userGaze: document.getElementById('user-gaze'),
    gazeEye: document.getElementById('gaze-eye'),
    eyeInner: document.querySelector('.eye-inner')
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
});

function initSurveillance() {
    addObservation('SYSTEM', 'Observation protocols initialized');
    addObservation('SYSTEM', 'Subject has entered the exhibition');
}

async function initFaceApi() {
    try {
        // Load face-api.js models from CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        ]);
        
        state.faceApiLoaded = true;
        addObservation('AI', 'Face detection models loaded');
        console.log('Face-api.js models loaded successfully');
    } catch (err) {
        console.log('Face-api.js loading error:', err);
        addObservation('AI', 'Face detection unavailable - using fallback analysis');
    }
}

// =====================================================
// CAMERA FUNCTIONALITY
// =====================================================

function setupEventListeners() {
    // Camera modal buttons
    elements.allowBtn.addEventListener('click', requestCamera);
    elements.denyBtn.addEventListener('click', denyCamera);

    // Mouse tracking
    document.addEventListener('mousemove', trackMouse);
    document.addEventListener('click', trackClick);
    
    // Scroll tracking
    document.addEventListener('scroll', trackScroll);
    
    // Keyboard tracking
    document.addEventListener('keydown', trackKeypress);
    
    // Visibility tracking
    document.addEventListener('visibilitychange', trackVisibility);
    
    // Resize tracking
    window.addEventListener('resize', trackResize);
}

async function requestCamera() {
    elements.modal.classList.add('hidden');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        elements.webcam.srcObject = stream;
        state.videoStream = stream;
        state.webcamActive = true;
        
        // Wait for video to be ready
        elements.webcam.onloadedmetadata = () => {
            elements.webcam.play();
            createDetectionCanvas();
            
            // Start face detection loop
            if (state.faceApiLoaded) {
                startFaceDetection();
            } else {
                // If face-api not loaded, start basic color analysis
                startBasicAnalysis();
            }
            
            // Activate the gaze eye
            elements.gazeEye.classList.add('active');
        };
        
        addObservation('CAMERA', 'Subject has consented to visual observation');
        addObservation('AI', 'Initiating facial analysis protocols...');
        updateTicker('CAMERA ACCESS GRANTED — VISUAL OBSERVATION ACTIVE — AI ANALYSIS BEGINNING');
        
    } catch (err) {
        console.log('Camera access denied:', err);
        denyCamera();
    }
}

function denyCamera() {
    elements.modal.classList.add('hidden');
    document.body.classList.add('camera-denied');
    
    elements.userEyeColor.textContent = 'NO VISUAL';
    elements.userHairColor.textContent = 'NO VISUAL';
    elements.userBackground.textContent = 'NO VISUAL';
    elements.userGaze.textContent = 'NO VISUAL';
    
    addObservation('CAMERA', 'Subject denied visual observation');
    addObservation('SYSTEM', 'Continuing with behavioral surveillance only');
    updateTicker('CAMERA ACCESS DENIED — BEHAVIORAL OBSERVATION CONTINUES — YOU ARE STILL BEING WATCHED');
}

function createDetectionCanvas() {
    // Create an off-screen canvas for pixel analysis
    state.detectionCanvas = document.createElement('canvas');
    state.detectionCanvas.width = elements.webcam.videoWidth || 640;
    state.detectionCanvas.height = elements.webcam.videoHeight || 480;
}

// =====================================================
// FACE DETECTION & AI ANALYSIS
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
                // Hide eye when no face detected
                elements.gazeEye.style.opacity = '0.3';
            }
        } catch (err) {
            console.log('Detection error:', err);
        }
        
        // Run detection every 100ms
        setTimeout(detectFace, 100);
    };
    
    detectFace();
    
    // Run color analysis less frequently
    setInterval(analyzeColors, 2000);
}

function startBasicAnalysis() {
    // Fallback if face-api doesn't load
    setInterval(analyzeColors, 2000);
    addObservation('AI', 'Using basic color analysis mode');
}

function processFaceDetection(detection) {
    const landmarks = detection.landmarks;
    const positions = landmarks.positions;
    
    // Get eye positions
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Calculate eye centers
    const leftEyeCenter = getCenterPoint(leftEye);
    const rightEyeCenter = getCenterPoint(rightEye);
    
    // Get nose position for gaze reference
    const nose = landmarks.getNose();
    const noseCenter = getCenterPoint(nose);
    
    // Estimate gaze direction based on eye and nose positions
    const gazeDirection = estimateGaze(leftEyeCenter, rightEyeCenter, noseCenter, detection.detection.box);
    
    // Update gaze display
    state.gazeDirection = gazeDirection;
    elements.userGaze.textContent = gazeDirection;
    
    // Move the floating eye based on gaze
    moveGazeEye(gazeDirection, leftEyeCenter, rightEyeCenter);
    
    // Show eye when face detected
    elements.gazeEye.style.opacity = '1';
}

function getCenterPoint(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
}

function estimateGaze(leftEye, rightEye, nose, faceBox) {
    // Calculate face center
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;
    
    // Calculate eye midpoint
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    
    // Calculate offset from center
    const offsetX = (nose.x - faceCenterX) / faceBox.width;
    const offsetY = (nose.y - faceCenterY) / faceBox.height;
    
    // Determine direction
    let horizontal = 'CENTER';
    let vertical = '';
    
    if (offsetX < -0.05) horizontal = 'LEFT';
    else if (offsetX > 0.05) horizontal = 'RIGHT';
    
    if (offsetY < -0.1) vertical = 'UP-';
    else if (offsetY > 0.1) vertical = 'DOWN-';
    
    const direction = vertical + horizontal;
    
    // Log significant gaze changes
    if (direction !== state.gazeDirection) {
        addObservation('GAZE', `Subject looking ${direction}`);
    }
    
    return direction || 'CENTER';
}

function moveGazeEye(direction, leftEye, rightEye) {
    // Calculate base position from screen center
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    // Offset based on gaze direction
    let offsetX = 0;
    let offsetY = 0;
    const moveAmount = 200;
    
    if (direction.includes('LEFT')) offsetX = -moveAmount;
    if (direction.includes('RIGHT')) offsetX = moveAmount;
    if (direction.includes('UP')) offsetY = -moveAmount;
    if (direction.includes('DOWN')) offsetY = moveAmount;
    
    // Add some randomness for natural movement
    offsetX += (Math.random() - 0.5) * 30;
    offsetY += (Math.random() - 0.5) * 30;
    
    // Position the eye
    const eyeX = screenCenterX + offsetX - 40; // 40 = half eye width
    const eyeY = screenCenterY + offsetY - 40;
    
    elements.gazeEye.style.left = `${eyeX}px`;
    elements.gazeEye.style.top = `${eyeY}px`;
    
    // Move the pupil within the eye based on direction
    let pupilX = 0;
    let pupilY = 0;
    
    if (direction.includes('LEFT')) pupilX = -5;
    if (direction.includes('RIGHT')) pupilX = 5;
    if (direction.includes('UP')) pupilY = -5;
    if (direction.includes('DOWN')) pupilY = 5;
    
    if (elements.eyeInner) {
        elements.eyeInner.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
    }
    
    // Occasional blink
    if (Math.random() < 0.02) {
        elements.gazeEye.classList.add('blinking');
        setTimeout(() => elements.gazeEye.classList.remove('blinking'), 150);
    }
}

// =====================================================
// COLOR ANALYSIS
// =====================================================

function analyzeColors() {
    if (!state.webcamActive || !state.detectionCanvas) return;
    
    const ctx = state.detectionCanvas.getContext('2d');
    const video = elements.webcam;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, state.detectionCanvas.width, state.detectionCanvas.height);
    
    // Analyze different regions
    analyzeEyeColor(ctx);
    analyzeHairColor(ctx);
    analyzeBackground(ctx);
}

function analyzeEyeColor(ctx) {
    // If we have face detection, use eye landmarks
    // Otherwise, sample from typical eye region
    
    let eyeRegion;
    
    if (state.lastFaceDetection) {
        const landmarks = state.lastFaceDetection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const eyeCenter = getCenterPoint(leftEye);
        
        // Sample a small region around the eye
        eyeRegion = ctx.getImageData(
            Math.max(0, eyeCenter.x - 10),
            Math.max(0, eyeCenter.y - 5),
            20, 10
        );
    } else {
        // Fallback: sample center-upper region where eyes typically are
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
    // Sample from the top portion of the frame (above face)
    const w = state.detectionCanvas.width;
    const h = state.detectionCanvas.height;
    
    let hairRegion;
    
    if (state.lastFaceDetection) {
        const box = state.lastFaceDetection.detection.box;
        // Sample above the detected face
        hairRegion = ctx.getImageData(
            Math.max(0, box.x),
            Math.max(0, box.y - 50),
            box.width,
            40
        );
    } else {
        // Fallback: top center of frame
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
    // Sample from the edges of the frame (avoiding the center where face is)
    const w = state.detectionCanvas.width;
    const h = state.detectionCanvas.height;
    
    // Sample left edge
    const leftEdge = ctx.getImageData(0, h * 0.2, w * 0.15, h * 0.6);
    // Sample right edge
    const rightEdge = ctx.getImageData(w * 0.85, h * 0.2, w * 0.15, h * 0.6);
    
    // Combine samples
    const combinedData = new Uint8ClampedArray(leftEdge.data.length + rightEdge.data.length);
    combinedData.set(leftEdge.data);
    combinedData.set(rightEdge.data, leftEdge.data.length);
    
    const dominantColor = getDominantColor(combinedData);
    const brightness = (dominantColor.r + dominantColor.g + dominantColor.b) / 3;
    
    // Classify environment
    let environment = '';
    
    if (brightness < 50) {
        environment = 'DARK ENVIRONMENT';
    } else if (brightness < 100) {
        environment = 'DIM LIGHTING';
    } else if (brightness < 180) {
        environment = 'NORMAL LIGHTING';
    } else {
        environment = 'BRIGHT ENVIRONMENT';
    }
    
    // Add color description
    const colorName = classifyBackgroundColor(dominantColor);
    environment = `${colorName} / ${environment}`;
    
    if (environment !== state.backgroundColor) {
        state.backgroundColor = environment;
        elements.userBackground.textContent = environment;
        addObservation('AI', `Environment: ${environment}`);
    }
}

function getDominantColor(pixels) {
    let r = 0, g = 0, b = 0;
    let count = 0;
    
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
    const { r, g, b } = color;
    
    // Convert to HSL for better color classification
    const hsl = rgbToHsl(r, g, b);
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;
    
    // Very dark = likely pupil/dark brown
    if (l < 0.2) return 'DARK BROWN';
    
    // Low saturation = gray
    if (s < 0.15) {
        if (l < 0.4) return 'DARK GRAY';
        return 'GRAY';
    }
    
    // Blue range
    if (h >= 180 && h <= 260) {
        if (l < 0.4) return 'DARK BLUE';
        if (l > 0.6) return 'LIGHT BLUE';
        return 'BLUE';
    }
    
    // Green range
    if (h >= 80 && h <= 160) {
        if (b > g * 0.7) return 'HAZEL';
        return 'GREEN';
    }
    
    // Brown/amber range
    if (h >= 20 && h <= 50) {
        if (l > 0.5) return 'AMBER';
        if (l > 0.35) return 'LIGHT BROWN';
        return 'BROWN';
    }
    
    return 'BROWN';
}

function classifyHairColor(color) {
    const { r, g, b } = color;
    const hsl = rgbToHsl(r, g, b);
    const l = hsl.l;
    const s = hsl.s;
    const h = hsl.h;
    
    // Very dark
    if (l < 0.15) return 'BLACK';
    if (l < 0.25) return 'DARK BROWN';
    
    // Very light
    if (l > 0.7 && s < 0.3) return 'GRAY/WHITE';
    if (l > 0.6) return 'BLONDE';
    
    // Red range
    if (h >= 0 && h <= 30 && s > 0.3) return 'RED/AUBURN';
    
    // Brown range
    if (l < 0.4) return 'BROWN';
    
    return 'LIGHT BROWN';
}

function classifyBackgroundColor(color) {
    const { r, g, b } = color;
    const hsl = rgbToHsl(r, g, b);
    
    if (hsl.s < 0.1) {
        if (hsl.l < 0.3) return 'DARK';
        if (hsl.l > 0.7) return 'LIGHT';
        return 'NEUTRAL';
    }
    
    // Color names based on hue
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
    r /= 255;
    g /= 255;
    b /= 255;
    
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
    // Browser info
    const browser = detectBrowser();
    elements.userBrowser.textContent = browser;
    
    // Device info
    const device = detectDevice();
    elements.userDevice.textContent = device;
    
    // Screen info
    const screen = `${window.screen.width}x${window.screen.height}`;
    elements.userScreen.textContent = screen;
    
    addObservation('DEVICE', `Browser identified: ${browser}`);
    addObservation('DEVICE', `Screen resolution: ${screen}`);
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera')) return 'Opera';
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
            const maskedIP = `${ipParts[0]}.${ipParts[1]}.XXX.XXX`;
            elements.userIP.textContent = maskedIP;
            addObservation('NETWORK', `IP address detected: ${maskedIP}`);
        }
        
        if (data.city && data.country_name) {
            const location = `${data.city}, ${data.region}, ${data.country_name}`;
            elements.userLocation.textContent = location;
            addObservation('LOCATION', `Subject located in ${location}`);
        }
        
    } catch (err) {
        elements.userIP.textContent = 'MASKED';
        elements.userLocation.textContent = 'UNDISCLOSED';
        addObservation('NETWORK', 'IP detection blocked or unavailable');
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
    
    const dx = state.mouseX - state.lastMouseX;
    const dy = state.mouseY - state.lastMouseY;
    
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
        direction = dy > 0 ? 'DOWN' : 'UP';
    }
    
    if (state.mouseMovements % 50 === 0) {
        addObservation('MOUSE', `Cursor moved ${direction} — Position: ${state.mouseX}, ${state.mouseY}`);
    }
}

function trackClick(e) {
    state.clicks++;
    state.lastActivity = Date.now();
    
    const target = e.target.tagName.toLowerCase();
    let description = `Click detected on ${target}`;
    
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
    
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    
    if (state.scrolls % 5 === 0) {
        addObservation('SCROLL', `Subject scrolled — ${scrollPercent}% through exhibition`);
    }
}

function trackKeypress(e) {
    state.keystrokes++;
    state.lastActivity = Date.now();
    addObservation('INPUT', 'Keystroke detected');
}

function trackVisibility() {
    if (document.hidden) {
        addObservation('ATTENTION', 'Subject has left the exhibition tab');
        updateTicker('SUBJECT HAS DIVERTED ATTENTION — TAB INACTIVE — OBSERVATION PAUSED');
    } else {
        addObservation('ATTENTION', 'Subject has returned to exhibition');
        updateTicker('SUBJECT HAS RETURNED — OBSERVATION RESUMED — WELCOME BACK, WE MISSED YOU');
    }
}

function trackResize() {
    const newScreen = `${window.innerWidth}x${window.innerHeight}`;
    addObservation('WINDOW', `Viewport resized to ${newScreen}`);
}

// =====================================================
// OBSERVATION LOG
// =====================================================

function addObservation(type, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
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

// =====================================================
// TICKER
// =====================================================

function updateTicker(message) {
    const tickerMessages = [
        message,
        `TOTAL MOUSE MOVEMENTS: ${state.mouseMovements}`,
        `TOTAL CLICKS: ${state.clicks}`,
        `YOU ARE BEING OBSERVED`,
        `THE SCREEN IS NOT NEUTRAL`,
        `TO OBSERVE IS TO ACT`,
        message
    ];
    
    elements.ticker.innerHTML = tickerMessages.map(msg => 
        `<span class="ticker-item">${msg}</span>`
    ).join('');
}

function generateTickerContent() {
    const messages = [];
    
    const timeOnPage = Math.floor((Date.now() - state.startTime) / 1000);
    if (timeOnPage > 60) {
        messages.push(`SUBJECT HAS BEEN OBSERVED FOR ${Math.floor(timeOnPage / 60)} MINUTES`);
    }
    
    messages.push(`MOUSE MOVEMENTS RECORDED: ${state.mouseMovements}`);
    messages.push(`CLICK EVENTS CAPTURED: ${state.clicks}`);
    
    // Add AI detection info if available
    if (state.eyeColor) {
        messages.push(`EYE COLOR DETECTED: ${state.eyeColor}`);
    }
    if (state.gazeDirection) {
        messages.push(`CURRENT GAZE: ${state.gazeDirection}`);
    }
    
    const philosophical = [
        'OBSERVATION CREATES REALITY',
        'THE ACT OF OBSERVATION CHANGES WHAT IS OBSERVED',
        'YOU ARE WATCHING — YOU ARE BEING WATCHED',
        'THE SCREEN IS NOT NEUTRAL — TO OBSERVE IS TO ACT',
        'IDENTITY IS PERFORMED — IDENTITY IS CONSUMED',
        'THE NETWORKED GAZE TRANSFORMS BOTH OBSERVER AND OBSERVED'
    ];
    messages.push(philosophical[Math.floor(Math.random() * philosophical.length)]);
    
    const inactiveTime = (Date.now() - state.lastActivity) / 1000;
    if (inactiveTime > 10) {
        messages.unshift(`SUBJECT INACTIVE FOR ${Math.floor(inactiveTime)} SECONDS — ARE YOU STILL THERE?`);
    }
    
    elements.ticker.innerHTML = messages.map(msg => 
        `<span class="ticker-item">${msg}</span>`
    ).join('');
}

// =====================================================
// TIMERS
// =====================================================

function startTimers() {
    setInterval(updateTimeOnPage, 1000);
    setInterval(generateTickerContent, 10000);
    setInterval(checkInactivity, 5000);
    setTimeout(generateTickerContent, 3000);
}

function updateTimeOnPage() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    
    elements.timeOnPage.textContent = `${hours}:${minutes}:${seconds}`;
}

function checkInactivity() {
    const inactiveTime = (Date.now() - state.lastActivity) / 1000;
    
    if (inactiveTime > 30 && inactiveTime < 35) {
        addObservation('BEHAVIOR', 'Subject appears to be idle — still watching?');
    }
    
    if (inactiveTime > 60 && inactiveTime < 65) {
        addObservation('BEHAVIOR', 'Extended inactivity detected — subject may have abandoned observation');
    }
}

// =====================================================
// RANDOM OBSERVATIONS
// =====================================================

function generateRandomObservation() {
    const observations = [
        { type: 'ANALYSIS', msg: 'Behavioral patterns being recorded' },
        { type: 'SYSTEM', msg: 'Data packet transmitted' },
        { type: 'ANALYSIS', msg: 'Engagement metrics updating' },
        { type: 'AI', msg: 'Visual analysis processing...' }
    ];
    
    const obs = observations[Math.floor(Math.random() * observations.length)];
    addObservation(obs.type, obs.msg);
}

setInterval(() => {
    if (Math.random() > 0.7) {
        generateRandomObservation();
    }
}, 15000);

// =====================================================
// CONSOLE MESSAGE
// =====================================================

console.log(`
%c ◉ THE OBSERVER EFFECT ◉ 
%c You found the console. 
%c Even here, you are being watched.
%c
%c "Observation creates reality."
%c
%c This exhibition explores how the networked gaze 
%c transforms both observer and observed.
%c
%c Curated by Dasean
`,
'color: #ff3333; font-size: 20px; font-weight: bold;',
'color: #00ff41; font-size: 12px;',
'color: #888; font-size: 12px;',
'',
'color: #ffcc00; font-style: italic;',
'',
'color: #888;',
'color: #888;',
'',
'color: #00d4ff;'
);
