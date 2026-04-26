import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sun, 
  Zap, 
  AlertTriangle, 
  ArrowRight,
  CornerUpLeft,
  Music,
  Navigation,
  Bluetooth,
  BluetoothConnected,
  Maximize
} from 'lucide-react';

export default function App() {
  // Application State
  const [isConnected, setIsConnected] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(83);
  const [range, setRange] = useState(320);
  const [gear, setGear] = useState('P');
  const [driveMode, setDriveMode] = useState('SPORT');
  const [currentTime, setCurrentTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

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

  // Fullscreen, Orientation, and Scaling Effect
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    const handleResize = () => {
      // Calculate scale to fit 1280x720 perfectly in the window
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      setScale(Math.min(scaleX, scaleY));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    
    // Initial scale calculation
    handleResize();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
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
        // BLE integration placeholder
      });
      setIsConnected(true);
      device.addEventListener('gattserverdisconnected', () => setIsConnected(false));
    } catch (error) {
      console.error('Bluetooth Connection failed!', error);
      alert('Failed to connect. Error: ' + error.message);
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

  // If not in fullscreen, show launch screen to enforce landscape
  if (!isFullscreen) {
    return (
      <div className="min-h-screen w-full bg-[#030303] text-white flex flex-col items-center justify-center font-sans">
        <h1 className="text-4xl font-bold mb-8 tracking-widest text-center px-4">EV DASHBOARD</h1>
        <button 
          onClick={launchDashboard}
          className="bg-[#2196f3] hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg tracking-wide shadow-[0_0_30px_rgba(33,150,243,0.4)] transition-all flex items-center gap-3"
        >
          <Maximize className="w-6 h-6" />
          LAUNCH FULLSCREEN
        </button>
        <p className="mt-8 text-zinc-500 text-sm max-w-sm text-center px-4">
          Browsers require user interaction to enter Fullscreen and lock orientation. For the perfect experience, tap launch.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#030303] overflow-hidden fixed inset-0">
      
      {/* 1280x720 Fixed Container that mathematically scales to fit ANY screen perfectly */}
      <div 
        className="relative bg-[#030303] text-white font-sans select-none flex flex-col overflow-hidden"
        style={{ 
          width: '1280px', 
          height: '720px', 
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        
        {/* Absolute Bluetooth Button */}
        <div className="absolute top-8 right-8 z-50">
          <button 
            onClick={connectBLE}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-lg ${
              isConnected 
                ? 'bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/50 hover:bg-[#00ff9d]/30' 
                : 'bg-[#151515] border border-zinc-800/50 text-white hover:bg-[#252525]'
            }`}
          >
            {isConnected ? <BluetoothConnected className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
            {isConnected ? 'ESP32 Connected' : 'Connect BLE'}
          </button>
        </div>

        {/* Top Bar (Height: ~100px with padding) */}
        <div className="flex justify-between items-center px-8 pt-8 h-[100px]">
          <div className="flex gap-6">
            <button 
              onClick={() => document.exitFullscreen()}
              className="bg-[#151515] w-14 h-14 rounded-full hover:bg-[#222] transition-colors focus:outline-none flex items-center justify-center border border-zinc-800/30"
            >
              <ArrowLeft className="w-6 h-6 text-zinc-500" />
            </button>
            <button className="bg-[#151515] w-14 h-14 rounded-full hover:bg-[#222] transition-colors focus:outline-none flex items-center justify-center border border-zinc-800/30">
              <Sun className="w-6 h-6 text-zinc-500" />
            </button>
          </div>
          
          <div className="text-4xl font-bold tracking-widest font-mono text-white uppercase ml-14">
            {currentTime || '11:23 PM'}
          </div>
          
          <div className="flex items-center gap-8 mr-[180px]">
            <span className="text-2xl font-light text-zinc-400">24°C</span>
            <button className="bg-[#151515] w-14 h-14 rounded-full hover:bg-[#222] transition-colors focus:outline-none flex items-center justify-center border border-zinc-800/30">
              <ArrowRight className="w-6 h-6 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Main Content (Height: 620px) */}
        <div className="flex-grow flex justify-between items-stretch px-8 pb-8 pt-2 gap-8">
          
          {/* Left Column (Width: 320px) */}
          <div className="w-[320px] flex flex-col gap-6 pt-4">
            <div className="bg-[#111111] rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl relative h-[280px] border border-zinc-800/30">
              <div className="flex justify-between items-center w-full">
                <span className="text-zinc-500 font-medium tracking-[0.2em] text-sm">BATTERY</span>
                <span className="text-[#00ff9d] font-bold text-3xl">{battery}%</span>
              </div>
              
              <div className="w-full h-3 bg-[#222] rounded-full overflow-hidden mt-6 mb-8">
                <div 
                  className="h-full bg-[#00ff9d] rounded-full shadow-[0_0_15px_#00ff9d] transition-all duration-500"
                  style={{ width: `${battery}%` }}
                ></div>
              </div>

              <div className="flex flex-col items-center justify-center mt-auto pb-2">
                <span className="text-6xl font-bold tracking-tight text-white drop-shadow-md">{range}</span>
                <span className="text-zinc-600 font-semibold tracking-[0.2em] text-xs mt-3">KM RANGE</span>
              </div>
            </div>

            <div className="flex gap-4 h-[90px]">
              <button className="bg-[#151515] hover:bg-[#252525] rounded-[1.5rem] flex-grow flex items-center justify-center gap-3 transition-colors shadow-lg border border-zinc-800/30 active:scale-95">
                <Zap className="w-7 h-7 text-orange-500 fill-orange-500" />
                <span className="font-bold text-sm tracking-widest text-white">CHARGE</span>
              </button>
              <button className="bg-[#151515] hover:bg-[#252525] rounded-[1.5rem] w-[90px] flex items-center justify-center transition-colors shadow-lg border border-zinc-800/30 active:scale-95">
                <AlertTriangle className="w-8 h-8 text-orange-400 fill-orange-400/20" />
              </button>
            </div>
          </div>

          {/* Center Column (Width: 500px) */}
          <div className="w-[500px] flex flex-col items-center justify-center relative">
            <div className="relative w-[500px] h-[500px] flex items-center justify-center -mt-16">
              <svg className="absolute inset-0 w-full h-full drop-shadow-2xl" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0px 0px 20px ${accentColor}60)` }}>
                <path d="M 20 80 A 45 45 0 1 1 80 80" fill="none" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M 20 80 A 45 45 0 1 1 80 80"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
              
              <div className="flex flex-col items-center justify-center z-10 mt-12">
                <span className="text-[150px] leading-none font-bold tracking-tighter text-white drop-shadow-lg transition-all duration-300">
                  {speed}
                </span>
                <span className="text-zinc-500 font-semibold tracking-[0.2em] text-sm mt-4">KM / H</span>
                
                <div className="mt-8 flex items-center justify-center">
                  <span 
                    className="text-5xl font-black text-transparent bg-clip-text transition-colors duration-300" 
                    style={{ 
                      backgroundImage: `linear-gradient(to bottom, ${accentColor}, ${accentColor})`,
                      WebkitTextStroke: `1px ${accentColor}`,
                      filter: `drop-shadow(0px 0px 12px ${accentColor})`
                    }}
                  >
                    {gear}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-full px-12 py-5 flex gap-12 items-center shadow-2xl absolute bottom-6 border border-zinc-800/40">
              {['P', 'R', 'N', 'D'].map((g) => (
                <span 
                  key={g}
                  onClick={() => setGear(g)}
                  className={`text-3xl font-bold cursor-pointer transition-colors ${
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

          {/* Right Column (Width: 320px) */}
          <div className="w-[320px] flex flex-col gap-6 pt-4">
            <div className="bg-[#111111] rounded-[2rem] shadow-2xl relative h-[240px] flex flex-col border border-zinc-800/30 overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-60" style={{ transform: 'perspective(500px) rotateX(45deg) scale(1.5)', transformOrigin: 'top' }}></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111] z-0"></div>

              <div className="p-6 flex justify-between items-start z-10 w-full relative">
                <div className="flex items-center gap-3">
                  <CornerUpLeft className="w-7 h-7 text-[#00e5ff]" strokeWidth={3} />
                  <span className="font-bold text-2xl text-white drop-shadow-md">200m</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#00ff9d] font-bold text-xl drop-shadow-[0_0_5px_rgba(0,255,157,0.3)]">12 min</span>
                  <span className="text-zinc-500 font-medium text-sm mt-1">5.4 km</span>
                </div>
              </div>
              
              <div className="absolute inset-x-0 bottom-10 flex flex-col items-center justify-end z-10 pointer-events-none">
                <div className="w-1 h-20 bg-[#00e5ff] shadow-[0_0_15px_#00e5ff] relative">
                  <div className="absolute -top-6 -left-[14px]">
                    <Navigation className="w-8 h-8 text-white fill-white transform rotate-45 drop-shadow-lg" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] rounded-[2rem] shadow-2xl p-5 flex items-center gap-6 border border-zinc-800/30 h-[90px]">
              <div className="pl-4">
                <Music className="w-8 h-8 text-[#00e5ff]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-xl text-white tracking-wide">Nightcall</span>
                <span className="text-zinc-500 font-medium text-sm">Kavinsky</span>
              </div>
            </div>

            <div className="bg-[#111111] rounded-[2rem] shadow-2xl p-6 flex justify-between items-center border border-zinc-800/30 h-[80px]">
              <span className="text-zinc-500 font-medium tracking-[0.2em] text-sm pl-2">TRIP A</span>
              <span className="font-bold text-2xl text-white pr-2">142.5 km</span>
            </div>

            <div className="bg-[#0a0a0a] rounded-full shadow-2xl p-2 flex mt-auto border border-zinc-800/40">
              {['ECO', 'CITY', 'SPORT'].map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setDriveMode(mode)}
                  className={`flex-1 py-4 rounded-full font-semibold text-sm tracking-[0.2em] transition-all duration-300 focus:outline-none ${
                    driveMode === mode 
                      ? `text-white shadow-[0_0_20px_${getModeColor()}80]` 
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
    </div>
  );
}
