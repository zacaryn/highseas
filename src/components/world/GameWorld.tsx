import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PerspectiveCamera } from '@react-three/drei';
import Ocean from './Ocean';
import Island from './Island';
import Ship from '../ships/Ship';
import WindEffect from './WindEffect';
import { ShipClass, ShipDamage } from '../../models/ShipTypes';
import { useWindStore } from '../../store/useWindStore';

interface GameWorldProps {
  shipDamage?: ShipDamage;
  isStorm?: boolean;
  shipClass?: ShipClass;
}

// Constants for realistic map scale
const MAP_SCALE = 14; // Increased map scale for larger world
const OCEAN_SIZE = 250 * MAP_SCALE; // Ocean size in game units
const ISLAND_SCALE = 6.0; // Increased island scale for better proportion to ships

// Caribbean islands data with approximate relative positions
// Coordinates based on simplified Caribbean layout
// These are not actual GPS coordinates but relative positions
const CARIBBEAN_ISLANDS = [
  {
    name: 'Cuba',
    position: [-20 * MAP_SCALE, 0, -5 * MAP_SCALE],
    size: [15 * ISLAND_SCALE, 1.2, 6 * ISLAND_SCALE],
    rotation: [0, 0.4, 0]
  },
  {
    name: 'Jamaica',
    position: [-5 * MAP_SCALE, 0, 5 * MAP_SCALE],
    size: [4 * ISLAND_SCALE, 1.4, 1.8 * ISLAND_SCALE],
    rotation: [0, 0.3, 0]
  },
  {
    name: 'Hispaniola',
    position: [5 * MAP_SCALE, 0, -8 * MAP_SCALE],
    size: [14 * ISLAND_SCALE, 1.8, 5 * ISLAND_SCALE],
    rotation: [0, -0.2, 0]
  },
  {
    name: 'Puerto Rico',
    position: [22 * MAP_SCALE, 0, -10 * MAP_SCALE],
    size: [4 * ISLAND_SCALE, 1.1, 2 * ISLAND_SCALE],
    rotation: [0, 0.15, 0]
  },
  {
    name: 'Bahamas',
    position: [-10 * MAP_SCALE, 0, -15 * MAP_SCALE],
    size: [6 * ISLAND_SCALE, 0.6, 8 * ISLAND_SCALE],
    rotation: [0, 0.7, 0],
    isArchipelago: true
  },
  {
    name: 'Lesser Antilles',
    position: [28 * MAP_SCALE, 0, 0 * MAP_SCALE],
    size: [2 * ISLAND_SCALE, 0.9, 15 * ISLAND_SCALE],
    rotation: [0, 0, 0],
    isArchipelago: true
  },
  {
    name: 'Trinidad',
    position: [25 * MAP_SCALE, 0, 15 * MAP_SCALE],
    size: [2.5 * ISLAND_SCALE, 1.1, 2 * ISLAND_SCALE],
    rotation: [0, 0.1, 0]
  },
  {
    name: 'Barbados',
    position: [32 * MAP_SCALE, 0, 10 * MAP_SCALE],
    size: [1.5 * ISLAND_SCALE, 0.8, 1.5 * ISLAND_SCALE],
    rotation: [0, 0, 0]
  },
  {
    name: 'Tortuga',
    position: [2 * MAP_SCALE, 0, -2 * MAP_SCALE],
    size: [1.2 * ISLAND_SCALE, 0.7, 0.8 * ISLAND_SCALE],
    rotation: [0, 0.4, 0]
  },
  {
    name: 'Nassau',
    position: [-12 * MAP_SCALE, 0, -20 * MAP_SCALE],
    size: [1.2 * ISLAND_SCALE, 0.5, 1.5 * ISLAND_SCALE],
    rotation: [0, 0, 0]
  },
  {
    name: 'Grand Cayman',
    position: [-15 * MAP_SCALE, 0, 12 * MAP_SCALE],
    size: [1.8 * ISLAND_SCALE, 0.6, 1 * ISLAND_SCALE],
    rotation: [0, 0.2, 0]
  }
];

// Distant shores data - representing mainland areas
const DISTANT_SHORES = [
  {
    name: 'DistantShore',
    position: [-60 * MAP_SCALE, 0, -40 * MAP_SCALE],
    size: [60 * MAP_SCALE, 3, 30 * MAP_SCALE],
    rotation: [0, 0.3, 0]
  },
  {
    name: 'Gulf Coast',
    position: [-60 * MAP_SCALE, 0, -15 * MAP_SCALE],
    size: [50 * ISLAND_SCALE, 1.5, 35 * ISLAND_SCALE],
    rotation: [0, Math.PI / 7, 0],
    isDistantShore: true
  },
  {
    name: 'Yucatan Peninsula',
    position: [-40 * MAP_SCALE, 0, 30 * MAP_SCALE],
    size: [30 * ISLAND_SCALE, 2, 40 * ISLAND_SCALE],
    rotation: [0, -Math.PI / 6, 0],
    isDistantShore: true
  },
  {
    name: 'Central America',
    position: [-15 * MAP_SCALE, 0, 50 * MAP_SCALE],
    size: [60 * ISLAND_SCALE, 3, 30 * ISLAND_SCALE],
    rotation: [0, Math.PI / 16, 0],
    isDistantShore: true
  },
  {
    name: 'South America',
    position: [40 * MAP_SCALE, 0, 50 * MAP_SCALE],
    size: [45 * ISLAND_SCALE, 4, 40 * ISLAND_SCALE],
    rotation: [0, -Math.PI / 20, 0],
    isDistantShore: true
  },
  {
    name: 'Florida',
    position: [-40 * MAP_SCALE, 0, -40 * MAP_SCALE],
    size: [40 * ISLAND_SCALE, 2, 30 * ISLAND_SCALE],
    rotation: [0, Math.PI / 4, 0],
    isDistantShore: true
  }
];

const GameWorld: React.FC<GameWorldProps> = ({ 
  shipDamage,
  isStorm = false,
  shipClass = ShipClass.Frigate
}) => {
  const worldRef = useRef<THREE.Group>(null);
  const shipRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { updateWind, randomizeWind } = useWindStore();
  const { camera } = useThree();
  
  // Camera follow parameters
  const cameraOffset = useRef(new THREE.Vector3(0, 20, 40)); // Increased height and distance for better view
  const cameraLookAt = useRef(new THREE.Vector3(0, 0, 0)); // Initially looking at origin
  const cameraLerpFactor = 0.05; // Smoothness factor (lower = smoother)
  
  // New state to track loaded islands and performance
  const [islandLoadCount, setIslandLoadCount] = useState(0);
  const [performanceMode, setPerformanceMode] = useState(false);
  
  // Ship tracking state
  const [shipPosition, setShipPosition] = useState(new THREE.Vector3(0, 1, 0));
  const [shipRotation, setShipRotation] = useState(0);

  // Initialize with random wind on first load
  useEffect(() => {
    randomizeWind();
    
    // Optional: change wind patterns periodically (simulating weather changes)
    const weatherChangeInterval = setInterval(() => {
      // 5% chance of significant weather change each minute
      if (Math.random() < 0.05) {
        randomizeWind();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(weatherChangeInterval);
  }, [randomizeWind]);

  // Performance monitoring effect
  useEffect(() => {
    // Monitor framerate to detect performance issues
    let frameCount = 0;
    let lastTime = performance.now();
    
    const checkPerformance = () => {
      const currentTime = performance.now();
      const elapsedTime = currentTime - lastTime;
      
      // If we have more than 1 second of data
      if (elapsedTime > 1000) {
        // Calculate frames per second
        const fps = (frameCount * 1000) / elapsedTime;
        
        // If FPS is too low, enable performance mode
        if (fps < 20 && !performanceMode) {
          console.log("Low performance detected, enabling performance mode");
          setPerformanceMode(true);
        } else if (fps > 30 && performanceMode) {
          console.log("Performance improved, disabling performance mode");
          setPerformanceMode(false);
        }
        
        // Reset counters
        frameCount = 0;
        lastTime = currentTime;
      }
      
      frameCount++;
      requestAnimationFrame(checkPerformance);
    };
    
    const requestId = requestAnimationFrame(checkPerformance);
    return () => cancelAnimationFrame(requestId);
  }, [performanceMode]);

  // Track number of islands loaded for performance monitoring
  const handleIslandLoaded = useCallback(() => {
    setIslandLoadCount(prev => prev + 1);
  }, []);
  
  // Camera follow function
  const updateCameraPosition = useCallback((shipPos: THREE.Vector3, shipRot: number, delta: number) => {
    if (!cameraRef.current) return;
    
    // Calculate ideal camera position based on ship position and rotation
    // Adjusted to view the proper side of the ship
    const idealOffset = new THREE.Vector3(
      Math.sin(shipRot) * cameraOffset.current.z,
      cameraOffset.current.y,
      Math.cos(shipRot) * cameraOffset.current.z
    );
    
    // Add the ideal offset to the ship position
    const targetCameraPosition = shipPos.clone().add(idealOffset);
    
    // Smoothly interpolate current camera position to target position
    cameraRef.current.position.lerp(targetCameraPosition, cameraLerpFactor * (60 * delta));
    
    // Calculate camera look target (slightly ahead of ship)
    const lookAheadDistance = 15;
    const lookAheadVector = new THREE.Vector3(
      -Math.sin(shipRot) * lookAheadDistance,
      0,
      -Math.cos(shipRot) * lookAheadDistance
    );
    
    const targetLookAt = shipPos.clone().add(lookAheadVector);
    cameraLookAt.current.lerp(targetLookAt, cameraLerpFactor * (60 * delta));
    
    // Make camera look at target position
    cameraRef.current.lookAt(cameraLookAt.current);
    
    // Copy our controlled camera's properties to the default Three.js camera
    camera.position.copy(cameraRef.current.position);
    camera.quaternion.copy(cameraRef.current.quaternion);
    camera.updateProjectionMatrix();
  }, [camera]);
  
  useFrame((state, delta) => {
    // Update wind state each frame
    updateWind(delta);
    
    // Update ship tracking
    if (worldRef.current) {
      // Find ship in children
      const ship = worldRef.current.children.find(child => child.name === 'player-ship');
      if (ship) {
        // Update ship position and rotation for camera tracking
        const shipPosition = new THREE.Vector3();
        ship.getWorldPosition(shipPosition);
        setShipPosition(shipPosition);
        
        // Get ship rotation
        const shipRotation = ship.rotation.y;
        setShipRotation(shipRotation);
        
        // Update camera
        updateCameraPosition(shipPosition, shipRotation, delta);
        
        // Log ship position occasionally for debugging
        if (Math.random() < 0.01) { // Log once in 100 frames
          console.log("Ship position:", shipPosition);
        }
      }
    }
  });

  return (
    <group ref={worldRef}>
      {/* Custom camera for ship following */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault={false} // Don't make it default, we'll update the default camera
        position={[0, 15, 30]}
        fov={45}
        near={0.1}
        far={1000}
      />
      
      {/* Ocean with increased size */}
      <Ocean isStorm={isStorm} args={[OCEAN_SIZE, OCEAN_SIZE]} />
      
      {/* Wind visualization - increased area for larger map */}
      <WindEffect count={250} size={0.08} area={OCEAN_SIZE} height={15} />
      
      {/* Distant shores - mainland areas */}
      {DISTANT_SHORES.map((shore, index) => (
        <Island 
          key={`shore-${index}`}
          position={shore.position as [number, number, number]}
          size={shore.size as [number, number, number]}
          rotation={shore.rotation as [number, number, number]}
          name={shore.name}
          isDistantShore={shore.isDistantShore}
        />
      ))}
      
      {/* Caribbean islands with realistic layouts - only show in detail mode */}
      {(!performanceMode || islandLoadCount < 6) && CARIBBEAN_ISLANDS.map((island, index) => (
        <Island 
          key={`island-${index}`}
          position={island.position as [number, number, number]}
          size={island.size as [number, number, number]}
          rotation={island.rotation as [number, number, number]}
          name={island.name}
          isArchipelago={island.isArchipelago || false}
        />
      ))}
      
      {/* Player's ship - moved to last to ensure it renders on top */}
      <Ship 
        shipClass={shipClass}
        position={[0, 1, 0]} // Ensure ship is above water (increased y position)
        rotation={[0, 0, 0]} 
        damage={shipDamage}
      />
    </group>
  );
};

export default GameWorld; 