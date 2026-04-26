import React, { useState, useEffect } from 'react';
import { 
  Sun, 
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
import { playGearSound, playModeSound, playAlertSound, playIndicatorSound } from './sounds';

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
  const isSpeeding = speed > 140;
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

  // Speed Simulation Effect based on Gear
  useEffect(() => {
    let interval;
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
    return () => clearInterval(interval);
  }, [gear, driveMode]);

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
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        // BLE integration logic
      });
      setIsConnected(true);
      device.addEventListener('gattserverdisconnected', () => setIsConnected(false));
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
    <div className="flex flex-col h-screen w-screen bg-[#030303] text-white font-sans select-none overflow-hidden p-4 md:p-6 lg:p-8">
      
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
        <div className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-widest font-mono text-white uppercase text-center absolute left-1/2 transform -translate-x-1/2">
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
          <div className={`bg-[#111111] rounded-[2rem] p-5 lg:p-8 flex flex-col justify-between shadow-2xl relative flex-grow border ${isLowBattery ? 'border-red-500/50 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'border-zinc-800/30'} transition-colors duration-300`}>
            <div className="flex justify-between items-center w-full">
              <span className={`font-medium tracking-[0.2em] text-xs lg:text-sm ${isLowBattery ? 'text-red-500' : 'text-zinc-500'}`}>BATTERY</span>
              <span className={`font-bold text-xl lg:text-3xl ${isLowBattery ? 'text-red-500' : 'text-[#00ff9d]'}`}>{battery}%</span>
            </div>
            
            <div className="w-full h-2 lg:h-3 bg-[#222] rounded-full overflow-hidden my-4 lg:my-6">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isLowBattery ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-[#00ff9d] shadow-[0_0_15px_#00ff9d]'}`}
                style={{ width: `${battery}%` }}
              ></div>
            </div>

            <div className="flex flex-col items-center justify-center mt-auto">
              <span className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-md">{range}</span>
              <span className="text-zinc-600 font-semibold tracking-[0.2em] text-[10px] lg:text-xs mt-2">KM RANGE</span>
            </div>
          </div>

          <div className="flex gap-4 h-[18%] mt-4">
            {/* Battery Test Button to Trigger Alert */}
            <button 
              onClick={() => setBattery(b => b > 10 ? b - 15 : 83)} 
              className="bg-[#151515] hover:bg-[#252525] rounded-[1.5rem] flex-grow flex items-center justify-center gap-2 lg:gap-3 transition-colors shadow-lg border border-zinc-800/30 active:scale-95"
            >
              <Zap className={`w-5 h-5 lg:w-7 lg:h-7 ${isLowBattery ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500'}`} />
              <span className="font-bold text-xs lg:text-sm tracking-widest text-white">TEST BATT</span>
            </button>
            <button 
              onClick={() => { document.exitFullscreen(); }} 
              className="bg-[#151515] hover:bg-[#252525] rounded-[1.5rem] aspect-square flex items-center justify-center transition-colors shadow-lg border border-zinc-800/30 active:scale-95"
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
              <span className={`text-[80px] md:text-[110px] lg:text-[140px] leading-none font-bold tracking-tighter drop-shadow-lg transition-colors duration-300 ${isSpeeding ? 'text-red-500' : 'text-white'}`}>
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

          <div className="bg-[#0a0a0a] rounded-full px-6 md:px-10 lg:px-12 py-3 lg:py-5 flex gap-6 md:gap-10 lg:gap-12 items-center shadow-2xl absolute bottom-0 border border-zinc-800/40">
            {['P', 'R', 'N', 'D'].map((g) => (
              <span 
                key={g}
                onClick={() => handleGearChange(g)}
                className={`text-xl lg:text-3xl font-bold cursor-pointer transition-colors ${
                  gear === g 
                    ? 'text-white font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110' 
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[28%] flex flex-col justify-between">
          <div className="bg-[#111111] rounded-[2rem] shadow-2xl relative flex-grow-[2] flex flex-col border border-zinc-800/30 overflow-hidden mb-4">
            <div className="absolute inset-0 bg-grid opacity-60" style={{ transform: 'perspective(500px) rotateX(45deg) scale(1.5)', transformOrigin: 'top' }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111] z-0"></div>

            <div className="p-4 lg:p-6 flex justify-between items-start z-10 w-full relative">
              <div className="flex items-center gap-2 lg:gap-3">
                <CornerUpLeft className="w-5 h-5 lg:w-7 lg:h-7 text-[#00e5ff]" strokeWidth={3} />
                <span className="font-bold text-xl lg:text-2xl text-white drop-shadow-md">200m</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[#00ff9d] font-bold text-lg lg:text-xl drop-shadow-[0_0_5px_rgba(0,255,157,0.3)]">12 min</span>
                <span className="text-zinc-500 font-medium text-xs lg:text-sm mt-1">5.4 km</span>
              </div>
            </div>
            
            <div className="absolute inset-x-0 bottom-6 lg:bottom-10 flex flex-col items-center justify-end z-10 pointer-events-none">
              <div className="w-1 h-12 lg:h-20 bg-[#00e5ff] shadow-[0_0_15px_#00e5ff] relative">
                <div className="absolute -top-4 -left-[10px] lg:-top-6 lg:-left-[14px]">
                  <Navigation className="w-6 h-6 lg:w-8 lg:h-8 text-white fill-white transform rotate-45 drop-shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111111] rounded-[2rem] shadow-2xl p-4 lg:p-5 flex items-center gap-4 lg:gap-6 border border-zinc-800/30 flex-grow mb-4">
            <div className="pl-2 lg:pl-4">
              <Music className="w-6 h-6 lg:w-8 lg:h-8 text-[#00e5ff]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-bold text-base lg:text-xl text-white tracking-wide">Nightcall</span>
              <span className="text-zinc-500 font-medium text-[10px] lg:text-sm">Kavinsky</span>
            </div>
          </div>

          <div className="bg-[#111111] rounded-[2rem] shadow-2xl p-4 lg:p-6 flex justify-between items-center border border-zinc-800/30 flex-grow mb-4">
            <span className="text-zinc-500 font-medium tracking-[0.2em] text-[10px] lg:text-sm pl-2">TRIP A</span>
            <span className="font-bold text-lg lg:text-2xl text-white pr-2">142.5 km</span>
          </div>

          <div className="bg-[#0a0a0a] rounded-full shadow-2xl p-1.5 lg:p-2 flex border border-zinc-800/40 h-[12%]">
            {['ECO', 'CITY', 'SPORT'].map((mode) => (
              <button 
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 rounded-full font-semibold text-[10px] lg:text-sm tracking-[0.2em] transition-all duration-300 focus:outline-none flex items-center justify-center ${
                  driveMode === mode 
                    ? `text-white shadow-[0_0_15px_${getModeColor()}80]` 
                    : 'text-zinc-500 hover:text-white'
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
