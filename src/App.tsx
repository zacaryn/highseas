import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import './App.css';

// Components will be imported here later
import GameWorld from './components/world/GameWorld';
import WindIndicator from './components/ui/WindIndicator';
import DamageControl from './components/ui/DamageControl';
import WeatherControl from './components/ui/WeatherControl';
import ShipSelector from './components/ui/ShipSelector';
import { setupKeyboardControls } from './store/useControls';
import { ShipDamage, createDefaultShipDamage, ShipClass } from './models/ShipTypes';
import { WindStrength } from './models/WindModel';
import { useWindStore } from './store/useWindStore';

function App() {
  // Ship damage state
  const [shipDamage, setShipDamage] = useState<ShipDamage>(createDefaultShipDamage());
  const [isStormActive, setIsStormActive] = useState<boolean>(false);
  const [selectedShip, setSelectedShip] = useState<ShipClass>(ShipClass.Frigate);
  
  // Access wind store to set weather
  const { setStrength, setFluctuation } = useWindStore();
  
  // Handle damage updates from the UI
  const handleDamageUpdate = (type: string, value: number) => {
    setShipDamage(prev => {
      switch(type) {
        case 'hull':
          return { ...prev, hullIntegrity: value };
        case 'sail':
          return { ...prev, sailIntegrity: value };
        case 'mast':
          return { ...prev, mastIntegrity: value };
        case 'rudder':
          return { ...prev, rudderIntegrity: value };
        default:
          return prev;
      }
    });
  };
  
  // Handle weather changes
  const handleWeatherChange = (isStorm: boolean, windStrength: WindStrength) => {
    setIsStormActive(isStorm);
    setStrength(windStrength);
    
    // In storms, wind fluctuates more
    setFluctuation(isStorm ? 0.4 : 0.2);
  };

  // Handle ship selection
  const handleShipSelect = (shipClass: ShipClass) => {
    setSelectedShip(shipClass);
  };
  
  // Initialize keyboard controls
  useEffect(() => {
    const cleanup = setupKeyboardControls();
    return cleanup;
  }, []);

  return (
    <div className="App">
      {/* UI Overlays */}
      <div className="ui-overlay">
        <WindIndicator />
        <WeatherControl onWeatherChange={handleWeatherChange} />
        <ShipSelector onShipSelect={handleShipSelect} currentShip={selectedShip} />
        <DamageControl onUpdateDamage={handleDamageUpdate} />
      </div>
      
      <Canvas
        shadows
        camera={{ position: [0, 10, 20], fov: 45 }}
        style={{ width: '100vw', height: '100vh' }}
      >
        {/* Sky and environment lighting */}
        <Sky 
          sunPosition={[100, 80, 100]} 
          // Brighter, more vibrant sky on sunny days
          turbidity={isStormActive ? 8 : 7}
          rayleigh={isStormActive ? 4 : 0.5}
          mieCoefficient={isStormActive ? 0.005 : 0.0015}
          mieDirectionalG={isStormActive ? 0.7 : 0.85}
        />
        <ambientLight intensity={isStormActive ? 0.2 : 0.6} />
        <directionalLight 
          castShadow
          position={[100, 100, 50]} 
          intensity={isStormActive ? 1.0 : 2.5}
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
        />
        <Environment preset={isStormActive ? "night" : "sunset"} />
        
        {/* Main game world component */}
        <GameWorld 
          shipDamage={shipDamage} 
          isStorm={isStormActive}
          shipClass={selectedShip}
        />
        
        {/* Removed OrbitControls since we're using our own camera system */}
      </Canvas>
    </div>
  );
}

export default App;
