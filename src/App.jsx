import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Howl } from 'howler';
import { Scan, ShieldAlert, ShieldCheck } from 'lucide-react';

// --- Sound Setup ---
const alertSound = new Howl({ src: ['/beep.mp3'] });

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [data, setData] = useState(null);
  const [danger, setDanger] = useState(false);

  // 1. Load Models from Public Folder
  useEffect(() => {
    const loadModels = async () => {
      const URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(URL),
          faceapi.nets.ageGenderNet.loadFromUri(URL)
        ]);
        setModelsLoaded(true);
      } catch (e) { console.error(e); }
    };
    loadModels();
  }, []);

  // 2. Eye Logic
  const checkEyes = (landmarks) => {
    const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const leftEAR = (getDist(landmarks[37], landmarks[41]) + getDist(landmarks[38], landmarks[40])) / (2.0 * getDist(landmarks[36], landmarks[39]));
    const rightEAR = (getDist(landmarks[43], landmarks[47]) + getDist(landmarks[44], landmarks[46])) / (2.0 * getDist(landmarks[42], landmarks[45]));
    return (leftEAR + rightEAR) / 2 < 0.26; // Threshold
  };

  // 3. Loop
  const handleVideo = () => {
    setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        
        if (canvasRef.current) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withAgeAndGender();
          const resized = faceapi.resizeResults(detections, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, displaySize.width, displaySize.height);

          if (resized.length > 0) {
            const det = resized[0];
            const isClosed = checkEyes(det.landmarks.positions);
            setDanger(isClosed);
            
            if (isClosed && !alertSound.playing()) alertSound.play();
            
            setData({
              age: Math.round(det.age),
              gender: det.gender,
              box: det.detection.box
            });

            // Draw Fancy UI on Face
            const box = det.detection.box;
            ctx.strokeStyle = isClosed ? '#FF0000' : '#00FF00';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          } else {
            setData(null);
          }
        }
      }
    }, 100);
  };

  return (
    <div className="h-screen w-full bg-gray-900 flex items-center justify-center relative font-mono">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Main Container */}
      <div className="relative z-10 w-[90%] max-w-4xl border border-cyan-500/30 bg-black/60 backdrop-blur-md rounded-xl p-4 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h1 className="text-cyan-400 text-xl font-bold flex items-center gap-2"><Scan /> AI SENTINEL SYSTEM</h1>
          <span className={modelsLoaded ? "text-green-500" : "text-yellow-500 animate-pulse"}>
            {modelsLoaded ? "SYSTEM ONLINE" : "LOADING AI..."}
          </span>
        </div>

        {/* Camera Area */}
        <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 h-[500px] bg-black">
          {modelsLoaded && (
            <>
              <Webcam ref={webcamRef} onUserMedia={handleVideo} className="w-full h-full object-cover" mirrored={true} />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
            </>
          )}

          {/* Overlay Stats */}
          {data && (
            <div className="absolute top-4 left-4 space-y-2">
              <div className="bg-black/50 p-2 rounded border-l-2 border-cyan-400">
                <p className="text-xs text-cyan-200">TARGET AGE</p>
                <p className="text-xl font-bold text-white">{data.age}</p>
              </div>
              <div className="bg-black/50 p-2 rounded border-l-2 border-purple-400">
                <p className="text-xs text-purple-200">GENDER</p>
                <p className="text-xl font-bold text-white uppercase">{data.gender}</p>
              </div>
            </div>
          )}

          {/* DANGER ALERT */}
          {danger && (
            <div className="absolute inset-0 border-4 border-red-500 animate-pulse flex items-center justify-center bg-red-500/20">
              <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-2xl flex items-center gap-2">
                <ShieldAlert size={32} /> WAKE UP! EYES CLOSED!
              </div>
            </div>
          )}
          
          {!danger && data && (
             <div className="absolute bottom-4 right-4 bg-green-600/80 text-white px-4 py-2 rounded flex items-center gap-2">
               <ShieldCheck /> DRIVER SAFE
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
