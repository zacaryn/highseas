import React, { useRef, useMemo, useEffect } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { Water } from 'three/examples/jsm/objects/Water.js';
import * as THREE from 'three';
import { useWindStore } from '../../store/useWindStore';
import { WindStrength, windDirectionToVector } from '../../models/WindModel';

// Extend Three.js with the Water component
extend({ Water });

interface WaterProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  args?: [number, number];
  isStorm?: boolean; // Add storm flag
}

// TypeScript type declaration for the Water component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      water: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.RefObject<Water>;
        args?: any;
        position?: [number, number, number];
        rotation?: [number, number, number];
        sunDirection?: THREE.Vector3;
        sunColor?: THREE.Color | string | number;
        waterColor?: THREE.Color | string | number;
        distortionScale?: number;
        fog?: boolean;
      };
    }
  }
}

// Get wave scale based on wind strength
const getWaveScale = (strength: WindStrength, isStorm: boolean = false): number => {
  let scale = 0;
  
  switch(strength) {
    case WindStrength.Calm: scale = 0.2; break;
    case WindStrength.LightAir: 
    case WindStrength.LightBreeze: scale = 0.4; break;
    case WindStrength.GentleBreeze: 
    case WindStrength.ModerateBreeze: scale = 1.0; break;
    case WindStrength.FreshBreeze: 
    case WindStrength.StrongBreeze: scale = 1.8; break;
    case WindStrength.NearGale: 
    case WindStrength.Gale: scale = 2.5; break;
    case WindStrength.StrongGale: 
    case WindStrength.Storm: scale = 3.5; break;
    case WindStrength.ViolentStorm: 
    case WindStrength.Hurricane: scale = 5.0; break;
    default: scale = 1.0;
  }
  
  // Enhance wave scale in storm conditions
  return isStorm ? scale * 1.5 : scale;
};

// Wave height based on wind strength (in world units)
const getMaxWaveHeight = (strength: WindStrength, isStorm: boolean = false): number => {
  let height = 0;
  
  switch(strength) {
    case WindStrength.Calm: height = 0.05; break;
    case WindStrength.LightAir: height = 0.1; break;
    case WindStrength.LightBreeze: height = 0.2; break;
    case WindStrength.GentleBreeze: height = 0.4; break;
    case WindStrength.ModerateBreeze: height = 0.6; break;
    case WindStrength.FreshBreeze: height = 0.8; break;
    case WindStrength.StrongBreeze: height = 1.2; break;
    case WindStrength.NearGale: height = 1.8; break;
    case WindStrength.Gale: height = 2.5; break;
    case WindStrength.StrongGale: height = 3.0; break;
    case WindStrength.Storm: height = 4.0; break;
    case WindStrength.ViolentStorm: height = 5.0; break;
    case WindStrength.Hurricane: height = 7.0; break;
    default: height = 0.5;
  }
  
  // Enhance wave height in storm conditions
  return isStorm ? height * 1.75 : height;
};

// Size of wave grid for calculations
const WAVE_RESOLUTION = 40;
const WAVE_SIZE = 100;

interface OceanState {
  waveHeightMap: Float32Array;
}

const Ocean: React.FC<WaterProps> = ({ 
  position = [0, 0, 0], 
  rotation = [-Math.PI / 2, 0, 0], 
  args = [100, 100],
  isStorm = false
}) => {
  const waterRef = useRef<any>(null);
  const { scene } = useThree();
  const { direction, strength, speedKnots } = useWindStore();
  
  // Wind direction as vector for water flow
  const windDirectionVector = useMemo(() => {
    return new THREE.Vector3(
      Math.cos(direction),
      0,
      Math.sin(direction)
    ).normalize();
  }, [direction]);
  
  // Calculate wave size based on wind strength and storm conditions
  const waveScale = getWaveScale(strength, isStorm);
  const maxWaveHeight = getMaxWaveHeight(strength, isStorm);

  // Create a wave height map - used for buoyancy calculations
  const oceanState = useMemo<OceanState>(() => {
    return {
      waveHeightMap: new Float32Array(WAVE_RESOLUTION * WAVE_RESOLUTION)
    };
  }, []);

  // Update the wave height map each frame
  const updateWaveHeightMap = useRef<(delta: number) => void>((delta: number) => {
    const { waveHeightMap } = oceanState;
    const time = Date.now() * 0.001; // current time in seconds
    const windFactor = speedKnots * 0.01;
    
    // Storm conditions add randomness and higher frequencies
    const stormFactor = isStorm ? 1.5 : 1.0;
    
    // Update each point in the wave grid
    for(let z = 0; z < WAVE_RESOLUTION; z++) {
      for(let x = 0; x < WAVE_RESOLUTION; x++) {
        const index = z * WAVE_RESOLUTION + x;
        
        // Convert grid coordinates to world space
        const worldX = (x / WAVE_RESOLUTION - 0.5) * WAVE_SIZE;
        const worldZ = (z / WAVE_RESOLUTION - 0.5) * WAVE_SIZE;
        
        // Calculate wave height using multiple sine waves for more natural movement
        // Direction factor influences wave direction based on wind
        const directionFactor = windDirectionVector.x * worldX + windDirectionVector.z * worldZ;
        
        // Use simplex noise for more natural waves
        let height = 0;
        // Primary wave
        height += Math.sin(worldX * 0.1 + time * windFactor + directionFactor * 0.05) * 0.5;
        // Secondary waves at different frequencies and phases
        height += Math.sin(worldZ * 0.15 + time * 0.7 * windFactor) * 0.3;
        height += Math.sin((worldX + worldZ) * 0.1 + time * 0.3) * 0.2;
        // Small choppy waves
        height += Math.sin(worldX * 0.4 + worldZ * 0.4 + time * 2 * windFactor) * 0.1;
        
        // Add storm-specific wave patterns
        if (isStorm) {
          // Rogue waves - higher frequency components
          height += Math.sin(worldX * 0.6 + time * 3 * windFactor) * 0.2 * stormFactor;
          height += Math.cos(worldZ * 0.7 + time * 2.5 * windFactor) * 0.15 * stormFactor;
          
          // Random choppiness 
          const randomFactor = Math.sin(worldX * 5 + worldZ * 5 + time * 4) * 0.1;
          height += randomFactor * stormFactor;
        }
        
        // Scale based on wave height
        height *= maxWaveHeight;
        
        // Store in wave height map
        waveHeightMap[index] = height;
      }
    }
  });

  // Water parameters
  const waterOptions = useMemo(() => {
    // Adjust water color based on storm conditions
    const stormWaterColor = new THREE.Color(0x001525); // Darker blue for storms
    const normalWaterColor = new THREE.Color(0x001e0f); // Normal blue-green
    const waterColor = isStorm ? stormWaterColor : normalWaterColor;
    
    return {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('/waternormals.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: isStorm ? 0xaaaaaa : 0xffffff, // Dimmer sun during storms
      waterColor: waterColor,
      distortionScale: 3.7 * waveScale,
      fog: scene.fog !== undefined
    };
  }, [scene.fog, waveScale, isStorm]);

  useFrame((state, delta) => {
    if (waterRef.current) {
      // Animate water - speed based on wind strength and storm conditions
      const stormTimeFactor = isStorm ? 1.8 : 1.0;  // Faster water movement in storms
      const timeMultiplier = (0.3 + (waveScale * 0.2)) * stormTimeFactor;
      waterRef.current.material.uniforms['time'].value += delta * timeMultiplier;
      
      // Update distortion scale based on wind
      waterRef.current.material.uniforms['distortionScale'].value = 3.7 * waveScale;
      
      // Update wave height map for physics calculations
      updateWaveHeightMap.current(delta);
    }
  });

  // Expose the wave height map through a public API for buoyancy calculations
  useEffect(() => {
    // Add to the Three.js scene as a property so other components can access it
    if (!scene.userData.ocean) {
      scene.userData.ocean = {};
    }
    
    scene.userData.ocean.getWaveHeight = (x: number, z: number): number => {
      // Convert world coordinates to grid indices
      const gridSize = WAVE_SIZE;
      const halfSize = gridSize / 2;
      
      // Normalize coordinates to 0-1 range in grid
      const normalizedX = (x + halfSize) / gridSize;
      const normalizedZ = (z + halfSize) / gridSize;
      
      // Convert to grid indices
      const gridX = Math.floor(normalizedX * WAVE_RESOLUTION);
      const gridZ = Math.floor(normalizedZ * WAVE_RESOLUTION);
      
      // Clamp to grid bounds
      const clampedX = Math.max(0, Math.min(WAVE_RESOLUTION - 1, gridX));
      const clampedZ = Math.max(0, Math.min(WAVE_RESOLUTION - 1, gridZ));
      
      // Get height from map
      const index = clampedZ * WAVE_RESOLUTION + clampedX;
      return oceanState.waveHeightMap[index];
    };
    
    scene.userData.ocean.getWaveResolution = () => WAVE_RESOLUTION;
    scene.userData.ocean.getWaveSize = () => WAVE_SIZE;
    scene.userData.ocean.getMaxWaveHeight = () => maxWaveHeight;
    scene.userData.ocean.isStorm = isStorm; // Expose storm condition
    
    return () => {
      // Cleanup if component unmounts
      if (scene.userData.ocean) {
        delete scene.userData.ocean;
      }
    };
  }, [oceanState, scene, maxWaveHeight, isStorm]);

  // Using primitive element to create the water instead of direct JSX
  return (
    <primitive 
      object={new Water(
        new THREE.PlaneGeometry(args[0], args[1], 32, 32), // Higher resolution for better waves
        {
          textureWidth: waterOptions.textureWidth,
          textureHeight: waterOptions.textureHeight,
          waterNormals: waterOptions.waterNormals,
          sunDirection: waterOptions.sunDirection,
          sunColor: waterOptions.sunColor,
          waterColor: waterOptions.waterColor,
          distortionScale: waterOptions.distortionScale,
          fog: waterOptions.fog
        }
      )}
      ref={waterRef}
      position={position}
      rotation={rotation}
    />
  );
};

export default Ocean; 