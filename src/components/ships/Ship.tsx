import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ShipClass, SHIP_STATS, ShipDamage, createDefaultShipDamage } from '../../models/ShipTypes';
import { useControls } from '../../store/useControls';
import { useWindStore } from '../../store/useWindStore';
import { 
  getAngleBetweenWindAndShip, 
  getPointOfSailMultiplier,
  windDirectionToVector 
} from '../../models/WindModel';

interface ShipProps {
  shipClass: ShipClass;
  position?: [number, number, number];
  rotation?: [number, number, number];
  damage?: ShipDamage;
}

interface ShipPhysicsState {
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  buoyancyPoints: THREE.Vector3[];
  shipRotation: number;
  sailAngle: number;
  previousSailAngle: number;
}

const Ship: React.FC<ShipProps> = ({ 
  shipClass = ShipClass.Sloop, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  damage = createDefaultShipDamage()
}) => {
  const shipRef = useRef<THREE.Group>(null);
  const mainSailRef = useRef<THREE.Mesh>(null);
  const hullRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const stats = SHIP_STATS[shipClass];
  
  // Add debug logging for ship rendering
  useEffect(() => {
    console.log("Ship component mounted", { shipClass, position, rotation });
    
    // Remove debug visibility box helper
    return () => {
      // Cleanup function
    };
  }, [shipClass, position, rotation, scene]);
  
  // Ship physics state
  const [physicsState, setPhysicsState] = useState<ShipPhysicsState>({
    velocity: new THREE.Vector3(0, 0, 0),
    angularVelocity: new THREE.Vector3(0, 0, 0),
    buoyancyPoints: [], // Will be initialized on first frame
    shipRotation: rotation[1],
    sailAngle: 0, // 0 is centered, -1 to 1 is sail angle
    previousSailAngle: 0,
  });
  
  // Add stabilization initialization flag
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const initializationTimeRef = useRef<number>(0);
  
  // Get controls from our custom hook
  const { forward, backward, left, right } = useControls();
  
  // Get wind state
  const { direction: windDirection, strength: windStrength, speedKnots } = useWindStore();
  
  // Initialize buoyancy points based on ship size
  useEffect(() => {
    // Create buoyancy points distributed across the hull
    // More points = more accurate but more expensive
    const numPointsLength = Math.max(4, Math.floor(stats.length / 4));
    const numPointsWidth = Math.max(2, Math.floor(stats.width / 3));
    
    const buoyancyPoints: THREE.Vector3[] = [];
    
    // Scale for our simplified ship model (convert real ship dimensions to game units)
    const lengthScale = 3 / stats.length; // 3 is our ship length in game units
    const widthScale = 1 / stats.width;   // 1 is our ship width in game units
    
    // Create a grid of points along the ship's hull
    for (let z = 0; z < numPointsLength; z++) {
      const zPos = (z / (numPointsLength - 1) - 0.5) * stats.length * lengthScale;
      
      for (let x = 0; x < numPointsWidth; x++) {
        const xPos = (x / (numPointsWidth - 1) - 0.5) * stats.width * widthScale;
        
        // Y position is negative because these points are below the center
        const yPos = -0.4; // Slightly below waterline by default
        
        buoyancyPoints.push(new THREE.Vector3(xPos, yPos, zPos));
      }
    }
    
    setPhysicsState(state => ({
      ...state,
      buoyancyPoints
    }));
  }, [stats.length, stats.width]);
  
  // Automatically adjust sails for best performance based on wind
  useEffect(() => {
    // This is a simplification - in reality, sail angle would be manually controlled
    // Here we're auto-adjusting for optimal point of sail
    const angleBetweenWindAndShip = getAngleBetweenWindAndShip(physicsState.shipRotation, windDirection);
    const optimalSailAngle = calculateOptimalSailAngle(angleBetweenWindAndShip);
    
    // Gradually adjust sail to optimal angle
    const adjustSailInterval = setInterval(() => {
      setPhysicsState(state => {
        const newAngle = state.sailAngle + (optimalSailAngle - state.sailAngle) * 0.1;
        // Only update if meaningful change
        return Math.abs(newAngle - state.sailAngle) > 0.01 
          ? { ...state, sailAngle: newAngle }
          : state;
      });
    }, 100);
    
    return () => clearInterval(adjustSailInterval);
  }, [physicsState.shipRotation, windDirection]);
  
  // Update sail visually when angle changes
  useEffect(() => {
    if (mainSailRef.current && physicsState.previousSailAngle !== physicsState.sailAngle) {
      // Visually rotate the sail mesh
      const maxRotation = Math.PI / 3; // 60 degrees max rotation
      mainSailRef.current.rotation.y = physicsState.sailAngle * maxRotation;
      
      setPhysicsState(state => ({
        ...state,
        previousSailAngle: state.sailAngle
      }));
    }
  }, [physicsState.sailAngle, physicsState.previousSailAngle]);
  
  // Calculate optimal sail angle based on wind angle
  const calculateOptimalSailAngle = (angleBetweenWindAndShip: number): number => {
    // Convert angle to degrees for easier understanding
    const angleDegrees = angleBetweenWindAndShip * (180 / Math.PI);
    
    // Into the wind (0-30 degrees): no good angle
    if (angleDegrees <= 30) {
      return 0; // Centered, but ineffective
    }
    // Close hauled (30-60 degrees): sail almost fully in
    else if (angleDegrees <= 60) {
      return 0.8;
    }
    // Beam reach (60-120 degrees): sail halfway out
    else if (angleDegrees <= 120) {
      return 0.5;
    }
    // Broad reach (120-150 degrees): sail mostly out
    else if (angleDegrees <= 150) {
      return 0.2;
    }
    // Running (150-180 degrees): sail fully out
    else {
      return 0;
    }
  };
  
  // Calculate the wave height at a given world position
  const getWaveHeight = (x: number, z: number): number => {
    if (scene.userData.ocean && typeof scene.userData.ocean.getWaveHeight === 'function') {
      return scene.userData.ocean.getWaveHeight(x, z);
    }
    return 0;
  };
  
  // Calculate buoyancy force for a point
  const calculateBuoyancyForce = (
    pointPosition: THREE.Vector3, 
    worldPosition: THREE.Vector3, 
    shipMatrix: THREE.Matrix4
  ): THREE.Vector3 => {
    // Convert local position to world space
    const worldPoint = pointPosition.clone().applyMatrix4(shipMatrix);
    
    // Get wave height at this point
    const waveHeight = getWaveHeight(worldPoint.x, worldPoint.z);
    
    // Calculate depth - how far below water this point is
    const depth = waveHeight - worldPoint.y;
    
    // No force if above water
    if (depth < 0) return new THREE.Vector3(0, 0, 0);
    
    // Base buoyancy factor - can be tuned
    const buoyancyFactor = 1.0;
    
    // Calculate force - proportional to depth and ship displacement
    // Adjust constant based on your game's physics scale
    const forceMagnitude = depth * buoyancyFactor * (stats.displacement / 1000) * 9.8;
    
    // Apply hull damage factor
    const damageFactor = damage.hullIntegrity;
    
    // Buoyancy force is always upward in world space
    return new THREE.Vector3(0, forceMagnitude * damageFactor, 0);
  };
  
  useFrame((state, delta) => {
    if (!shipRef.current || physicsState.buoyancyPoints.length === 0) return;
    
    // Stabilization period to prevent initial bounce
    if (!isInitialized) {
      initializationTimeRef.current += delta;
      
      // Position the ship at just the right height initially
      if (shipRef.current && scene.userData.ocean) {
        const waterHeight = scene.userData.ocean.getWaveHeight(
          shipRef.current.position.x, 
          shipRef.current.position.z
        ) || 0;
        
        // Set initial position slightly above water level (based on draft)
        shipRef.current.position.y = waterHeight - 0.3 * stats.draft / 10;
        
        if (initializationTimeRef.current > 0.5) {
          setIsInitialized(true);
        }
        
        // Return early during initialization
        return;
      }
    }
    
    // Get the ship's current world position and rotation matrix
    const shipMatrix = new THREE.Matrix4().makeRotationY(physicsState.shipRotation);
    shipMatrix.setPosition(shipRef.current.position);
    
    // Calculate forward direction based on ship rotation
    const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), physicsState.shipRotation);
    const rightDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), physicsState.shipRotation);
    
    // Make a working copy of velocity and angular velocity
    let newVelocity = physicsState.velocity.clone();
    let newAngularVelocity = physicsState.angularVelocity.clone();
    
    // Base physics parameters
    const maxAcceleration = 5 * (stats.speed / 10);
    const rotationSpeed = 1.5 * (stats.maneuverability / 10) * delta;
    const baseDrag = 0.95;
    
    // Speed realism factor - reduce overall speed for more realism
    const realisticSpeedFactor = 0.3;
    
    // Calculate wind effect
    const angleBetweenWindAndShip = getAngleBetweenWindAndShip(physicsState.shipRotation, windDirection);
    const pointOfSailMultiplier = getPointOfSailMultiplier(angleBetweenWindAndShip);
    
    // Apply sail damage effect
    const sailEfficiency = damage.sailIntegrity * damage.mastIntegrity;
    
    // Calculate wind vector
    const windVector = windDirectionToVector(windDirection);
    const windForce = speedKnots * 0.01; // Scale wind speed to a reasonable force
    
    // Handle ship rotation
    if (left) {
      // Apply rudder damage factor to turning
      const rudderFactor = damage.rudderIntegrity;
      const newRotation = physicsState.shipRotation + rotationSpeed * rudderFactor;
      
      setPhysicsState(state => ({
        ...state,
        shipRotation: newRotation
      }));
    }
    if (right) {
      const rudderFactor = damage.rudderIntegrity;
      const newRotation = physicsState.shipRotation - rotationSpeed * rudderFactor;
      
      setPhysicsState(state => ({
        ...state,
        shipRotation: newRotation
      }));
    }
    
    // Calculate final acceleration with wind factor and sail efficiency
    const finalAcceleration = maxAcceleration * delta * pointOfSailMultiplier * sailEfficiency * realisticSpeedFactor;
    
    // Apply wind force to velocity
    if (forward) {
      // When moving forward, use sail and wind physics
      const windEffect = windForce * pointOfSailMultiplier * sailEfficiency * realisticSpeedFactor;
      newVelocity.add(forwardDir.clone().multiplyScalar(finalAcceleration));
      
      // Add sideways drift based on wind
      const windDrift = windVector.clone().projectOnPlane(forwardDir);
      
      // Apply lateral drift (more pronounced for lighter/smaller ships)
      const lateralDriftFactor = 0.2 * (10 / stats.cargoCapacity) * realisticSpeedFactor;
      newVelocity.add(windDrift.multiplyScalar(windEffect * lateralDriftFactor));
    }
    
    if (backward) {
      // Backward movement ignores wind (using oars/manual power)
      newVelocity.add(forwardDir.clone().multiplyScalar(-maxAcceleration * 0.2 * delta * realisticSpeedFactor));
    }
    
    // Apply drag (water resistance) - more drag when moving against the wind
    const headwindFactor = (angleBetweenWindAndShip < Math.PI / 2) ? 
      0.98 + (0.04 * (1 - angleBetweenWindAndShip / (Math.PI / 2))) : 
      0.98;
    
    const finalDrag = Math.min(baseDrag * headwindFactor, 0.99);
    newVelocity.multiplyScalar(finalDrag);
    
    // Apply buoyancy forces
    let totalBuoyancyForce = new THREE.Vector3(0, 0, 0);
    let totalTorque = new THREE.Vector3(0, 0, 0);
    
    // Ship center position
    const shipPos = shipRef.current.position.clone();
    
    // Calculate buoyancy forces for each point
    physicsState.buoyancyPoints.forEach(point => {
      const force = calculateBuoyancyForce(point, shipPos, shipMatrix);
      
      if (force.lengthSq() > 0) {
        // Add to total force
        totalBuoyancyForce.add(force);
        
        // Calculate torque (cross product of position vector and force)
        // This creates rotational forces based on buoyancy
        const worldPoint = point.clone().applyMatrix4(shipMatrix);
        const relPos = worldPoint.clone().sub(shipPos);
        const torque = new THREE.Vector3().crossVectors(relPos, force);
        
        totalTorque.add(torque);
      }
    });
    
    // Apply buoyancy force to velocity (simplified)
    // In reality, this would involve mass and acceleration
    const buoyancyFactor = 0.01; // Tunable parameter
    newVelocity.add(totalBuoyancyForce.multiplyScalar(buoyancyFactor * delta));
    
    // Apply torque to angular velocity
    const torqueFactor = 0.0005; // Tunable parameter
    newAngularVelocity.add(totalTorque.multiplyScalar(torqueFactor * delta));
    
    // Add simplified gravity
    newVelocity.y -= 0.05 * delta;
    
    // Angular drag
    newAngularVelocity.multiplyScalar(0.95);
    
    // Maximum speed cap based on ship type and wind
    const maxSpeed = (stats.speed / 10) * (1 + pointOfSailMultiplier * 0.5) * realisticSpeedFactor;
    // Just cap horizontal speed, not vertical (buoyancy)
    const horizontalVelocity = new THREE.Vector3(
      newVelocity.x,
      0,
      newVelocity.z
    );
    
    if (horizontalVelocity.length() > maxSpeed) {
      horizontalVelocity.normalize().multiplyScalar(maxSpeed);
      newVelocity.x = horizontalVelocity.x;
      newVelocity.z = horizontalVelocity.z;
    }
    
    // Update ship position based on velocity
    if (shipRef.current) {
      shipRef.current.position.add(newVelocity);
      
      // Apply pitch and roll based on angular velocity and waves
      // Get wave heights at bow and stern to calculate pitch
      const bowPos = new THREE.Vector3(0, 0, -1.5).applyMatrix4(shipMatrix);
      const sternPos = new THREE.Vector3(0, 0, 1.5).applyMatrix4(shipMatrix);
      
      const bowWaveHeight = getWaveHeight(bowPos.x, bowPos.z);
      const sternWaveHeight = getWaveHeight(sternPos.x, sternPos.z);
      
      // Calculate wave-based pitch angle
      const pitchFromWaves = Math.atan2(sternWaveHeight - bowWaveHeight, 3) * 0.5; // 3 is ship length
      
      // Get wave heights at port and starboard to calculate roll
      const portPos = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(shipMatrix);
      const starboardPos = new THREE.Vector3(0.5, 0, 0).applyMatrix4(shipMatrix);
      
      const portWaveHeight = getWaveHeight(portPos.x, portPos.z);
      const starboardWaveHeight = getWaveHeight(starboardPos.x, starboardPos.z);
      
      // Calculate wave-based roll angle
      const rollFromWaves = Math.atan2(starboardWaveHeight - portWaveHeight, 1) * 0.5; // 1 is ship width
      
      // Blend angular velocity with wave-based rotation
      const blendFactor = 0.8; // How much to follow the waves vs physics
      
      const targetPitch = newAngularVelocity.x * (1 - blendFactor) + pitchFromWaves * blendFactor;
      const targetRoll = newAngularVelocity.z * (1 - blendFactor) + rollFromWaves * blendFactor;
      
      // Apply rotation, keeping the ship's heading (y-rotation) separate
      shipRef.current.rotation.x = targetPitch;
      shipRef.current.rotation.z = targetRoll;
      shipRef.current.rotation.y = physicsState.shipRotation;
      
      // Apply hull damage visually by sinking the ship slightly
      if (hullRef.current) {
        // As hull integrity decreases, ship sinks deeper
        const sinkDepth = (1 - damage.hullIntegrity) * 0.4;
        hullRef.current.position.y = -sinkDepth;
      }
    }
    
    // Update physics state
    setPhysicsState(state => ({
      ...state,
      velocity: newVelocity,
      angularVelocity: newAngularVelocity
    }));
  });
  
  // Different ship colors based on type
  const getShipColor = () => {
    switch (shipClass) {
      case ShipClass.Sloop:
        return '#8B4513'; // Saddle Brown
      case ShipClass.Frigate:
        return '#A0522D'; // Sienna
      case ShipClass.Galleon:
        return '#5F4A42'; // Dark wood
      case ShipClass.WarGalleon:
        return '#8B0000'; // Dark Red
      case ShipClass.PinnaceBrig:
        return '#D2691E'; // Chocolate
      case ShipClass.MerchantBrig:
        return '#CD853F'; // Peru
      default:
        return '#8B4513';
    }
  };
  
  // Get ship dimensions based on ship class
  const getShipDimensions = () => {
    switch (shipClass) {
      case ShipClass.Sloop:
        return {
          length: 3,
          width: 0.8,
          height: 0.8,
          mastHeight: 2.8,
          sailWidth: 1.4,
          sailHeight: 1.2,
          deckHeight: 0.25
        };
      case ShipClass.Frigate:
        return {
          length: 3.5,
          width: 1,
          height: 1,
          mastHeight: 3.5,
          sailWidth: 1.8,
          sailHeight: 1.6,
          deckHeight: 0.3
        };
      case ShipClass.Galleon:
        return {
          length: 4.2,
          width: 1.4,
          height: 1.5,
          mastHeight: 4,
          sailWidth: 2.2,
          sailHeight: 2,
          deckHeight: 0.35
        };
      case ShipClass.WarGalleon:
        return {
          length: 4.5,
          width: 1.6,
          height: 1.8,
          mastHeight: 4.5,
          sailWidth: 2.5,
          sailHeight: 2.2,
          deckHeight: 0.4
        };
      case ShipClass.PinnaceBrig:
        return {
          length: 2.8,
          width: 0.9,
          height: 0.9,
          mastHeight: 3,
          sailWidth: 1.6,
          sailHeight: 1.4,
          deckHeight: 0.28
        };
      case ShipClass.MerchantBrig:
        return {
          length: 3.2,
          width: 1.1,
          height: 1.1,
          mastHeight: 3.2,
          sailWidth: 1.9,
          sailHeight: 1.5,
          deckHeight: 0.32
        };
      default:
        return {
          length: 3,
          width: 1,
          height: 1,
          mastHeight: 3,
          sailWidth: 1.5,
          sailHeight: 1.5,
          deckHeight: 0.3
        };
    }
  };
  
  // Get number of masts based on ship class
  const getNumMasts = () => {
    switch (shipClass) {
      case ShipClass.Sloop:
        return 1;
      case ShipClass.Frigate:
        return 3;
      case ShipClass.Galleon:
      case ShipClass.WarGalleon:
        return 3;
      case ShipClass.PinnaceBrig:
      case ShipClass.MerchantBrig:
        return 2;
      default:
        return 1;
    }
  };
  
  // Ship dimensions
  const dimensions = getShipDimensions();
  const numMasts = getNumMasts();
  
  // Get positions for multiple masts
  const getMastPositions = () => {
    const positions = [];
    
    if (numMasts === 1) {
      // Single mast (centered)
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, 0]);
      return positions;
    }
    
    if (numMasts === 2) {
      // Two masts (fore and main)
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, -dimensions.length/4]); // Fore mast
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, dimensions.length/5]); // Main mast
      return positions;
    }
    
    if (numMasts === 3) {
      // Three masts (fore, main, mizzen)
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, -dimensions.length/3]); // Fore mast
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, 0]); // Main mast
      positions.push([0, dimensions.height/2 + dimensions.deckHeight, dimensions.length/3]); // Mizzen mast
      return positions;
    }
    
    // Default single mast
    positions.push([0, dimensions.height/2 + dimensions.deckHeight, 0]);
    return positions;
  };
  
  const mastPositions = getMastPositions();
  
  return (
    <group 
      ref={shipRef} 
      position={[position[0], position[1] + 0.5, position[2]]} // Elevate the ship above water slightly
      rotation={[0, physicsState.shipRotation, 0]}
      name="player-ship" // Add a name to identify the ship for debugging
    >
      {/* Ship hull - using the improved visibility */}
      <group>
        {/* Main hull */}
        <mesh 
          ref={hullRef}
          castShadow 
          receiveShadow 
          position={[0, 0, 0]} 
          visible={true} // Ensure visibility is set to true
        >
          <boxGeometry 
            args={[
              dimensions.width, 
              dimensions.height, 
              dimensions.length
            ]} 
          />
          <meshStandardMaterial 
            color={getShipColor()} 
            roughness={0.7} 
            metalness={0.2} // Adjust material properties for better visibility
          />
        </mesh>
        
        {/* Tapered bow (front) - much simpler */}
        <mesh 
          castShadow 
          receiveShadow 
          position={[0, 0, -dimensions.length/2 - dimensions.width/4]} 
          rotation={[0, Math.PI/2, 0]}
        >
          <boxGeometry 
            args={[
              dimensions.width/2,
              dimensions.height * 0.8,
              dimensions.width
            ]} 
          />
          <meshStandardMaterial color={getShipColor()} />
        </mesh>
        
        {/* Deck - simple flat surface */}
        <mesh 
          castShadow 
          receiveShadow 
          position={[0, dimensions.height/2 + dimensions.deckHeight/2, 0]}
        >
          <boxGeometry 
            args={[
              dimensions.width * 0.9, 
              dimensions.deckHeight, 
              dimensions.length * 0.9
            ]} 
          />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
        
        {/* Simple railings */}
        <mesh 
          castShadow 
          receiveShadow 
          position={[dimensions.width/2 * 0.9, dimensions.height/2 + dimensions.deckHeight + 0.1, 0]}
        >
          <boxGeometry args={[0.05, 0.2, dimensions.length * 0.9]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        <mesh 
          castShadow 
          receiveShadow 
          position={[-dimensions.width/2 * 0.9, dimensions.height/2 + dimensions.deckHeight + 0.1, 0]}
        >
          <boxGeometry args={[0.05, 0.2, dimensions.length * 0.9]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* Simple cabin for larger ships */}
        {(shipClass === ShipClass.Galleon || shipClass === ShipClass.WarGalleon || shipClass === ShipClass.Frigate) && (
          <mesh 
            castShadow 
            receiveShadow 
            position={[0, dimensions.height/2 + dimensions.deckHeight + 0.3, dimensions.length/3]}
          >
            <boxGeometry args={[dimensions.width * 0.7, 0.6, dimensions.length/4]} />
            <meshStandardMaterial color={getShipColor()} />
          </mesh>
        )}
      </group>
      
      {/* Masts - keep the nice sail system */}
      {mastPositions.map((position, index) => (
        <group key={`mast-${index}`}>
          {/* Main Mast */}
          <mesh 
            castShadow 
            receiveShadow 
            position={[position[0], position[1] + dimensions.mastHeight/2, position[2]]}
          >
            <cylinderGeometry args={[0.08, 0.1, dimensions.mastHeight, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Yards (horizontal spars) */}
          <mesh 
            castShadow 
            receiveShadow 
            position={[position[0], position[1] + dimensions.mastHeight * 0.7, position[2]]}
            rotation={[0, 0, Math.PI/2]}
          >
            <cylinderGeometry args={[0.05, 0.05, dimensions.sailWidth * 1.1, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Main Sail - reference for sail angle animation */}
          <mesh 
            ref={index === Math.floor(numMasts/2) ? mainSailRef : undefined}
            castShadow 
            receiveShadow 
            position={[position[0], position[1] + dimensions.mastHeight * 0.7, position[2] + 0.1]} 
            rotation={[0, 0, Math.PI/2]}
          >
            <planeGeometry args={[dimensions.sailHeight, dimensions.sailWidth]} />
            <meshStandardMaterial color="#F5F5DC" side={THREE.DoubleSide} />
          </mesh>
          
          {/* Additional smaller sail if appropriate */}
          {(shipClass !== ShipClass.Sloop) && (
            <mesh 
              castShadow 
              receiveShadow 
              position={[position[0], position[1] + dimensions.mastHeight * 1.1, position[2] + 0.1]} 
              rotation={[0, 0, Math.PI/2]}
            >
              <planeGeometry args={[dimensions.sailHeight * 0.6, dimensions.sailWidth * 0.7]} />
              <meshStandardMaterial color="#F5F5DC" side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export default Ship; 