import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon,
  Zap, 
  AlertTriangle, 
  CornerUpLeft,
  Music,
  Navigation,
  Bluetooth,
  BluetoothConnected,
  Maximize,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { playGearSound, playModeSound, playAlertSound, playIndicatorSound, playBikeStartupSound } from './sounds';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const createNavIcon = (heading) => {
  return L.divIcon({
    className: 'custom-nav-icon',
    html: `<div style="transform: rotate(${heading}deg); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(0, 229, 255, 0.2); border: 2px solid #00e5ff; border-radius: 50%; box-shadow: 0 0 15px rgba(0,229,255,0.6);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00e5ff" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function App() {
  // Application State
  const [isConnected, setIsConnected] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(83); // Test value
  const [range, setRange] = useState(320);
  const [gear, setGear] = useState('P');
  const [driveMode, setDriveMode] = useState('SPORT');
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState(null);
  
  // GPS State (Default 17°23'26"N 78°19'19"E)
  const [gpsData, setGpsData] = useState({ lat: 17.390555, lng: 78.321944, heading: 0 });
  
  // Turn Indicators State
  const [leftIndicator, setLeftIndicator] = useState(false);
  const [rightIndicator, setRightIndicator] = useState(false);
  const [indicatorBlink, setIndicatorBlink] = useState(true);

  // Time effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const launchDashboard = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock('landscape');
      }
      
      if (!isConnected) {
        const initVoice = new SpeechSynthesisUtterance("System online. Vehicle not connected.");
        initVoice.rate = 0.95;
        window.speechSynthesis.speak(initVoice);
      }
    } catch (e) {
      console.warn("Fullscreen/Orientation lock failed.", e);
    }
  };

  // Turn Indicators Blinking & Sound Effect
  useEffect(() => {
    let interval;
    if (leftIndicator || rightIndicator) {
      interval = setInterval(() => {
        setIndicatorBlink(prev => {
          playIndicatorSound(!prev); // Play tick/tock alternately
          return !prev;
        });
      }, 500);
    } else {
      setIndicatorBlink(true); // reset visually when turned off
    }
    return () => clearInterval(interval);
  }, [leftIndicator, rightIndicator]);

  // High Speed & Low Battery Alert Loop Effect
  const isSpeeding = speed > 50;
  const isLowBattery = battery <= 20;
  useEffect(() => {
    let alertInterval;
    if (isSpeeding || isLowBattery) {
      alertInterval = setInterval(() => {
        playAlertSound();
      }, 1000); // Beep every second while condition is true
    }
    return () => clearInterval(alertInterval);
  }, [isSpeeding, isLowBattery]);

  // Speed Simulation Effect (Only runs if ESP32 is NOT connected)
  useEffect(() => {
    let interval;
    if (!isConnected) {
      if (gear === 'D') {
        interval = setInterval(() => {
          setSpeed((prev) => {
            const targetCruisingSpeed = driveMode === 'ECO' ? 65 : driveMode === 'CITY' ? 85 : 130;
            if (prev < targetCruisingSpeed - 10) return prev + (driveMode === 'SPORT' ? 3 : 1);
            else if (prev > targetCruisingSpeed + 10) return prev - 2;
            else return Math.max(0, prev + (Math.floor(Math.random() * 3) - 1));
          });
        }, 200);
      } else {
        interval = setInterval(() => {
          setSpeed((prev) => (prev > 0 ? Math.max(0, prev - 3) : 0));
        }, 100);
      }
    }
    return () => clearInterval(interval);
  }, [gear, driveMode, isConnected]);

  // Handle sounds on manual clicks
  const handleGearChange = (g) => {
    if (g !== gear) {
      playGearSound();
      setGear(g);
      // Ensure turning off D decelerates smoothly
    }
  };

  const handleModeChange = (mode) => {
    if (mode !== driveMode) {
      playModeSound();
      setDriveMode(mode);
    }
  };

  // Web Bluetooth API
  const connectBLE = async () => {
    try {
      const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'; 
      const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID] 
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      setBleCharacteristic(characteristic);
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        try {
          const textDecoder = new TextDecoder('utf-8');
          const jsonString = textDecoder.decode(event.target.value);
          const data = JSON.parse(jsonString);
          if (data.s !== undefined) setSpeed(data.s);
          if (data.b !== undefined) setBattery(data.b);
          if (data.r !== undefined) setRange(data.r);
          if (data.lat !== undefined && data.lng !== undefined) {
            setGpsData({ lat: data.lat, lng: data.lng, heading: data.h || 0 });
          }
        } catch (err) {
          console.error("Failed to parse BLE JSON:", err);
        }
      });
      setIsConnected(true);
      
      // Personalized Voice Greeting & Engine Sound
      playBikeStartupSound();
      
      setTimeout(() => {
        const greeting = new SpeechSynthesisUtterance("Hello Rider, have a safe ride.");
        const voices = window.speechSynthesis.getVoices();
        // Try to find a high-quality Google voice or a female English voice
        const bestVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Google US English') || v.name.includes('Samantha') || (v.lang.startsWith('en') && v.name.includes('Female')));
        if (bestVoice) {
          greeting.voice = bestVoice;
        }
        greeting.rate = 0.95; // Friendly, natural pace
        greeting.pitch = 1.0;
        window.speechSynthesis.speak(greeting);
      }, 1800); // 1.8 second delay so the engine hum peaks first

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setIsSimulationMode(false);
        const alertVoice = new SpeechSynthesisUtterance("Warning. Vehicle disconnected.");
        alertVoice.rate = 0.95;
        window.speechSynthesis.speak(alertVoice);
      });
    } catch (error) {
      console.error('Bluetooth Connection failed!', error);
      // alert('Failed to connect. Error: ' + error.message); // Commented to prevent annoying popup during sound tests
    }
  };

  const getModeColor = () => {
    switch (driveMode) {
      case 'ECO': return '#00ff9d'; // Green
      case 'CITY': return '#00e5ff'; // Cyan
      case 'SPORT': return '#ff0044'; // Red/Pink
      default: return '#ff0044';
    }
  };
  const accentColor = getModeColor();

  const maxSpeed = 200;
  const speedPercentage = Math.min(speed, maxSpeed) / maxSpeed;
  const dashOffset = 100 - (speedPercentage * 100);

  // If not in fullscreen, show launch screen to enforce landscape interaction (required for Audio Context!)
  if (!isFullscreen) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col items-center justify-center font-sans">
        <h1 className="text-4xl font-bold mb-8 tracking-widest text-center px-4">EV DASHBOARD</h1>
        <button 
          onClick={launchDashboard}
          className="bg-[#2196f3] hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg tracking-wide shadow-[0_0_30px_rgba(33,150,243,0.4)] transition-all flex items-center gap-3"
        >
          <Maximize className="w-6 h-6" />
          START SYSTEM
        </button>
        <p className="mt-8 text-zinc-500 text-sm max-w-sm text-center px-4">
          Tap to start engine and enable Sound System + Fullscreen.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen ${isLightTheme ? 'bg-[#f4f4f5]' : 'bg-[#030303]'} font-sans select-none overflow-hidden p-4 md:p-6 lg:p-8 relative transition-colors duration-500`}>
      
      {/* Disconnected Overlay */}
      {!isConnected && !isSimulationMode && (
        <div className="absolute inset-0 z-40 bg-[#030303]/90 backdrop-blur-xl flex flex-col items-center justify-center">
          <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
          <h2 className="text-5xl md:text-6xl font-bold text-white tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">VEHICLE DISCONNECTED</h2>
          <p className="text-zinc-400 text-lg md:text-xl mb-12 tracking-wide">Please connect to the ESP32 hardware to receive telemetry data.</p>
          
          <div className="flex gap-6">
            <button 
              onClick={connectBLE}
              className="bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 px-8 py-4 rounded-full font-bold text-lg tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all flex items-center gap-3"
            >
              <Bluetooth className="w-6 h-6" />
              CONNECT HARDWARE
            </button>
            <button 
              onClick={() => setIsSimulationMode(true)}
              className="bg-zinc-800/50 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700/50 px-8 py-4 rounded-full font-bold text-lg tracking-widest transition-all"
            >
              SIMULATION MODE
            </button>
          </div>
        </div>
      )}

      {/* Absolute Bluetooth Button */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-50">
        <button 
          onClick={connectBLE}
          className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-md font-bold text-xs md:text-sm transition-colors shadow-lg ${
            isConnected 
              ? 'bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/50 hover:bg-[#00ff9d]/30' 
              : 'bg-[#151515] border border-zinc-800/50 text-white hover:bg-[#252525]'
          }`}
        >
          {isConnected ? <BluetoothConnected className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
          {isConnected ? 'ESP32 Connected' : 'Connect BLE'}
        </button>
      </div>

      {/* Top Bar with Turn Indicators */}
      <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0 h-[10%] w-full relative">
        
        {/* Left Indicator */}
        <div className="w-[150px] flex justify-start items-center">
          <button 
            onClick={() => {
              setLeftIndicator(!leftIndicator);
              setRightIndicator(false); // Disable right if left is pressed
            }}
            className={`transition-opacity duration-150 p-2 rounded-full focus:outline-none ${
              leftIndicator && indicatorBlink 
                ? 'text-[#00ff9d] drop-shadow-[0_0_15px_#00ff9d] opacity-100' 
                : 'text-zinc-800 opacity-40'
            }`}
          >
            <ChevronLeft className="w-12 h-12 lg:w-16 lg:h-16" strokeWidth={4} />
          </button>
        </div>
        
        {/* Time */}
        <div className={`text-2xl md:text-3xl lg:text-4xl font-bold tracking-widest font-mono uppercase text-center absolute left-1/2 transform -translate-x-1/2 ${isLightTheme ? 'text-zinc-800' : 'text-white'}`}>
          {currentTime || '11:23 PM'}
        </div>
        
        {/* Right Indicator */}
        <div className="w-[150px] flex justify-end items-center mr-16 lg:mr-24">
          <button 
            onClick={() => {
              setRightIndicator(!rightIndicator);
              setLeftIndicator(false); // Disable left if right is pressed
            }}
            className={`transition-opacity duration-150 p-2 rounded-full focus:outline-none ${
              rightIndicator && indicatorBlink 
                ? 'text-[#00ff9d] drop-shadow-[0_0_15px_#00ff9d] opacity-100' 
                : 'text-zinc-800 opacity-40'
            }`}
          >
            <ChevronRight className="w-12 h-12 lg:w-16 lg:h-16" strokeWidth={4} />
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-grow flex justify-between items-stretch gap-4 md:gap-6 lg:gap-8 h-[85%]">
        
        {/* Left Column */}
        <div className="w-[28%] flex flex-col justify-between">
          <div className={`${isLightTheme ? 'bg-white border-zinc-200' : 'bg-[#111111] border-zinc-800/30'} rounded-[2rem] p-5 lg:p-8 flex flex-col justify-between shadow-2xl relative flex-grow border ${isLowBattery ? (isLightTheme ? 'border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.1)]' : 'border-red-500/50 shadow-[0_0_20px_rgba(255,0,0,0.2)]') : ''} transition-colors duration-300`}>
            <div className="flex justify-between items-center w-full">
              <span className={`font-medium tracking-[0.2em] text-xs lg:text-sm ${isLowBattery ? 'text-red-500' : 'text-zinc-500'}`}>BATTERY</span>
              <span className={`font-bold text-xl lg:text-3xl ${isLowBattery ? 'text-red-500' : 'text-[#00ff9d]'}`}>{battery}%</span>
            </div>
            
            <div className={`w-full h-2 lg:h-3 ${isLightTheme ? 'bg-zinc-100' : 'bg-[#222]'} rounded-full overflow-hidden my-4 lg:my-6`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isLowBattery ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-[#00ff9d] shadow-[0_0_15px_#00ff9d]'}`}
                style={{ width: `${battery}%` }}
              ></div>
            </div>

            <div className="flex flex-col items-center justify-center mt-auto">
              <span className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight drop-shadow-md ${isLightTheme ? 'text-zinc-800' : 'text-white'}`}>{range}</span>
              <span className="text-zinc-500 font-semibold tracking-[0.2em] text-[10px] lg:text-xs mt-2">KM RANGE</span>
            </div>
          </div>

          <div className="flex gap-4 h-[18%] mt-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setIsLightTheme(!isLightTheme)} 
              className={`${isLightTheme ? 'bg-white hover:bg-zinc-50 border-zinc-200' : 'bg-[#151515] hover:bg-[#252525] border-zinc-800/30'} rounded-[1.5rem] aspect-square flex items-center justify-center transition-colors shadow-lg border active:scale-95`}
            >
              {isLightTheme ? <Moon className="w-6 h-6 lg:w-8 lg:h-8 text-zinc-500" /> : <Sun className="w-6 h-6 lg:w-8 lg:h-8 text-amber-400" />}
            </button>
            {/* Battery Reset Button */}
            <button 
              onClick={async () => {
                if (bleCharacteristic) {
                  try {
                    const encoder = new TextEncoder();
                    await bleCharacteristic.writeValue(encoder.encode("RESET_BATT"));
                    setBattery(80);
                  } catch (e) {
                    console.error("BLE Write failed", e);
                  }
                } else if (isSimulationMode) {
                  setBattery(80);
                } else {
                  setBattery(80); // Fallback for testing UI visually without BLE
                }
              }} 
              className={`${isLightTheme ? 'bg-white hover:bg-zinc-50 border-zinc-200' : 'bg-[#151515] hover:bg-[#252525] border-zinc-800/30'} rounded-[1.5rem] flex-grow flex items-center justify-center gap-2 lg:gap-3 transition-colors shadow-lg border active:scale-95`}
            >
              <Zap className={`w-5 h-5 lg:w-7 lg:h-7 ${isLowBattery ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500'}`} />
              <span className={`font-bold text-xs lg:text-sm tracking-widest ${isLightTheme ? 'text-zinc-800' : 'text-white'}`}>RESET BATT</span>
            </button>
            <button 
              onClick={() => { document.exitFullscreen(); }} 
              className={`${isLightTheme ? 'bg-white hover:bg-zinc-50 border-zinc-200' : 'bg-[#151515] hover:bg-[#252525] border-zinc-800/30'} rounded-[1.5rem] aspect-square flex items-center justify-center transition-colors shadow-lg border active:scale-95`}
            >
              <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8 text-orange-400 fill-orange-400/20" />
            </button>
          </div>
        </div>

        {/* Center Column */}
        <div className="w-[44%] flex flex-col items-center justify-center relative h-full">
          <div className="relative w-full aspect-square max-h-full flex items-center justify-center -mt-8 lg:-mt-12">
            <svg className="absolute inset-0 w-full h-full drop-shadow-2xl" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0px 0px 15px ${isSpeeding ? '#ef4444' : accentColor}60)` }}>
              <path d="M 20 80 A 45 45 0 1 1 80 80" fill="none" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
              <path
                d="M 20 80 A 45 45 0 1 1 80 80"
                fill="none"
                stroke={isSpeeding ? '#ef4444' : accentColor}
                strokeWidth="6"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={dashOffset}
                className="transition-all duration-300 ease-linear"
              />
            </svg>
            
            <div className="flex flex-col items-center justify-center z-10 mt-6 md:mt-10 lg:mt-12">
              <span className={`text-[80px] md:text-[110px] lg:text-[140px] leading-none font-bold tracking-tighter drop-shadow-lg transition-colors duration-300 ${isSpeeding ? 'text-red-500' : (isLightTheme ? 'text-zinc-900' : 'text-white')}`}>
                {speed}
              </span>
              <span className="text-zinc-500 font-semibold tracking-[0.2em] text-[10px] lg:text-sm mt-2 lg:mt-4">
                {isSpeeding ? 'SLOW DOWN' : 'KM / H'}
              </span>
              
              <div className="mt-4 lg:mt-8 flex items-center justify-center">
                <span 
                  className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text transition-colors duration-300" 
                  style={{ 
                    backgroundImage: `linear-gradient(to bottom, ${accentColor}, ${accentColor})`,
                    WebkitTextStroke: `1px ${accentColor}`,
                    filter: `drop-shadow(0px 0px 10px ${accentColor})`
                  }}
                >
                  {gear}
                </span>
              </div>
            </div>
          </div>

          <div className={`${isLightTheme ? 'bg-white border-zinc-200' : 'bg-[#0a0a0a] border-zinc-800/40'} rounded-full px-6 md:px-10 lg:px-12 py-3 lg:py-5 flex gap-6 md:gap-10 lg:gap-12 items-center shadow-2xl absolute bottom-0 border`}>
            {['P', 'R', 'N', 'D'].map((g) => (
              <span 
                key={g}
                onClick={() => handleGearChange(g)}
                className={`text-xl lg:text-3xl font-bold cursor-pointer transition-colors ${
                  gear === g 
                    ? (isLightTheme ? 'text-zinc-900 font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.1)] scale-110' : 'text-white font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110')
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[28%] flex flex-col justify-between h-full">
          
          {/* Huge GPS Map */}
          <div className={`${isLightTheme ? 'bg-white border-zinc-200' : 'bg-[#111111] border-zinc-800/30'} rounded-[2rem] shadow-2xl relative flex-grow flex flex-col border overflow-hidden mb-4 lg:mb-6 z-0 transition-colors duration-300`}>
            <MapContainer center={[gpsData.lat, gpsData.lng]} zoom={16} className="absolute inset-0 z-0" zoomControl={false} attributionControl={false}>
              <TileLayer
                url={isLightTheme ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
              />
              <MapUpdater center={[gpsData.lat, gpsData.lng]} />
              <Marker position={[gpsData.lat, gpsData.lng]} icon={createNavIcon(gpsData.heading)} />
            </MapContainer>
            
            <div className={`absolute top-4 right-4 z-10 flex flex-col items-end ${isLightTheme ? 'bg-white/80 border-zinc-200' : 'bg-[#0a0a0a]/80 border-zinc-800/50'} p-2 lg:p-3 rounded-xl backdrop-blur-md border`}>
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#00e5ff]" />
                <span className="text-[#00e5ff] font-bold text-sm lg:text-lg drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">GPS LIVE</span>
              </div>
              <span className="text-zinc-400 font-medium text-[10px] lg:text-sm mt-1 tracking-widest">{gpsData.heading}° HDG</span>
            </div>
          </div>

          {/* Expanded Drive Modes */}
          <div className={`${isLightTheme ? 'bg-white border-zinc-200' : 'bg-[#0a0a0a] border-zinc-800/40'} rounded-full shadow-2xl p-2 lg:p-3 flex border h-[15%] lg:h-[18%] shrink-0 transition-colors duration-300`}>
            {['ECO', 'CITY', 'SPORT'].map((mode) => (
              <button 
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 rounded-full font-bold text-xs md:text-sm lg:text-lg tracking-[0.2em] transition-all duration-300 focus:outline-none flex items-center justify-center ${
                  driveMode === mode 
                    ? `text-white shadow-[0_0_20px_${getModeColor()}80]` 
                    : (isLightTheme ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-500 hover:text-white')
                }`}
                style={{ backgroundColor: driveMode === mode ? getModeColor() : 'transparent' }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
