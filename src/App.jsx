import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Scan, ShieldAlert, ShieldCheck, Power } from 'lucide-react';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isStarted, setIsStarted] = useState(false); // New: Click to Start
  const [data, setData] = useState(null);
  const [danger, setDanger] = useState(false);

  // --- FIX 1: Online Sound (No Upload Needed) ---
  const beepAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  // --- Load AI ---
  useEffect(() => {
    const loadModels = async () => {
      // High Speed CDN Link
      const URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(URL),
          faceapi.nets.ageGenderNet.loadFromUri(URL)
        ]);
        setModelsLoaded(true);
      } catch (e) { console.error("Model Error:", e); }
    };
    loadModels();
  }, []);

  // --- FIX 2: Better Eye Logic ---
  const checkEyes = (landmarks) => {
    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    // Left Eye
    const leftV = getDist(landmarks[37], landmarks[41]) + getDist(landmarks[38], landmarks[40]);
    const leftH = getDist(landmarks[36], landmarks[39]) * 2;
    // Right Eye
    const rightV = getDist(landmarks[43], landmarks[47]) + getDist(landmarks[44], landmarks[46]);
    const rightH = getDist(landmarks[42], landmarks[45]) * 2;
    
    // Agar ratio 0.28 se kam hai to eyes closed hain (Thoda lenient kiya hai)
    return (leftV / leftH + rightV / rightH) / 2 < 0.28; 
  };

  const handleVideo = () => {
    setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4 && canvasRef.current) {
        const video = webcamRef.current.video;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        // --- FIX 3: Stronger Detection Settings ---
        // inputSize 224 aur scoreThreshold 0.3 kar diya taake face lost na ho
        const detections = await faceapi.detectAllFaces(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
        ).withFaceLandmarks().withAgeAndGender();

        const resized = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, displaySize.width, displaySize.height);

        if (resized.length > 0) {
          const det = resized[0];
          const isClosed = checkEyes(det.landmarks.positions);
          
          setDanger(isClosed);

          if (isClosed) {
             // Sound tabhi bajega agar user ne Start button dabaya ho
             if (isStarted) {
                beepAudio.currentTime = 0;
                beepAudio.play().catch(e => console.log("Audio block:", e));
             }
          }

          setData({
            age: Math.round(det.age),
            gender: det.gender,
            box: det.detection.box
          });

          // Draw Box
          const box = det.detection.box;
          ctx.strokeStyle = isClosed ? '#FF0000' : '#00FF00';
          ctx.lineWidth = 4;
          // Shadow effect for glow
          ctx.shadowBlur = 20;
          ctx.shadowColor = isClosed ? '#FF0000' : '#00FF00';
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.shadowBlur = 0; // Reset
        }
        // Note: Agar detect nahi hua to purana data rehne denge thodi der (Optional optimization)
      }
    }, 100);
  };

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center font-mono overflow-hidden relative">
      
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-black to-black opacity-50"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(0,255,255,0.05)_2px,transparent_2px)] bg-[size:50px_50px]"></div>

      {/* --- START SCREEN OVERLAY (Zaroori for Sound) --- */}
      {!isStarted && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <Scan size={64} className="text-cyan-400 animate-pulse mb-6" />
          <h1 className="text-3xl font-bold text-white mb-2 text-center">AI SECURITY SYSTEM</h1>
          <p className="text-gray-400 mb-8 text-center max-w-md">System is ready. Initialize to enable audio alerts and neural engine.</p>
          
          <button 
            onClick={() => setIsStarted(true)}
            disabled={!modelsLoaded}
            className={`px-8 py-4 rounded-full font-bold text-lg tracking-widest transition-all ${
              modelsLoaded 
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(6,182,212,0.6)] scale-100' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {modelsLoaded ? "INITIALIZE SYSTEM" : "LOADING MODELS..."}
          </button>
        </div>
      )}

      {/* Main App Interface */}
      <div className={`relative w-full max-w-4xl transition-opacity duration-1000 ${isStarted ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Top Bar */}
        <div className="flex justify-between items-center bg-gray-900/80 p-4 rounded-t-xl border border-gray-700 backdrop-blur">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
             <span className="text-cyan-400 font-bold">LIVE FEED</span>
          </div>
          <div className="text-xs text-gray-500">SECURE CONNECTION // 60FPS</div>
        </div>

        {/* Camera Feed */}
        <div className="relative border-x border-b border-gray-700 bg-black h-[60vh] lg:h-[70vh] flex justify-center overflow-hidden">
          {isStarted && (
            <>
              <Webcam 
                ref={webcamRef} 
                onUserMedia={handleVideo} 
                className="absolute inset-0 w-full h-full object-cover opacity-80" 
                mirrored={true} 
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </>
          )}

          {/* DANGER OVERLAY */}
          {danger && (
            <div className="absolute inset-0 border-[10px] border-red-600 animate-pulse bg-red-500/10 flex flex-col items-center justify-center z-20">
              <ShieldAlert size={80} className="text-red-500 mb-4 animate-bounce" />
              <h2 className="text-5xl font-black text-white bg-red-600 px-6 py-2">WAKE UP!</h2>
            </div>
          )}

          {/* SAFE OVERLAY */}
          {!danger && data && (
            <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500 backdrop-blur p-3 rounded flex items-center gap-3">
              <ShieldCheck className="text-emerald-400" />
              <div>
                <p className="text-xs text-emerald-200">STATUS</p>
                <p className="text-lg font-bold text-white">DRIVER SAFE</p>
              </div>
            </div>
          )}

          {/* Data Panel Bottom Left */}
          {data && !danger && (
            <div className="absolute bottom-4 left-4 space-y-2">
               <div className="bg-black/60 backdrop-blur p-3 rounded border-l-4 border-cyan-500">
                  <p className="text-xs text-cyan-300">ESTIMATED AGE</p>
                  <p className="text-2xl font-bold text-white">{data.age}</p>
               </div>
               <div className="bg-black/60 backdrop-blur p-3 rounded border-l-4 border-purple-500">
                  <p className="text-xs text-purple-300">GENDER</p>
                  <p className="text-2xl font-bold text-white uppercase">{data.gender}</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;