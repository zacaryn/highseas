import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWindStore } from '../../store/useWindStore';
import { WindStrength, windDirectionToVector } from '../../models/WindModel';

interface WindEffectProps {
  count?: number;
  size?: number;
  area?: number;
  height?: number;
}

const WindEffect: React.FC<WindEffectProps> = ({ 
  count = 50, 
  size = 0.1,
  area = 50,
  height = 5
}) => {
  const { direction, strength, speedKnots } = useWindStore();
  const pointsRef = useRef<THREE.Points>(null);
  const updateRef = useRef<number>(0);
  
  // Create particles for wind visualization
  const particles = useMemo(() => {
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Random position in a square area
      const x = (Math.random() - 0.5) * area;
      const y = Math.random() * height;
      const z = (Math.random() - 0.5) * area;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Store initial velocities - will be updated based on wind
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
      
      // Random opacity and size for more natural look
      opacities[i] = 0.3 + Math.random() * 0.7;
      sizes[i] = size * (0.5 + Math.random());
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return {
      geometry: particleGeometry,
      positions,
      velocities,
      opacities,
      sizes
    };
  }, [count, area, height, size]);
  
  // Get wind intensity factor for particle speed
  const getWindIntensityFactor = (strength: WindStrength): number => {
    switch(strength) {
      case WindStrength.Calm: return 0.2;
      case WindStrength.LightAir: 
      case WindStrength.LightBreeze: return 0.5;
      case WindStrength.GentleBreeze: 
      case WindStrength.ModerateBreeze: return 1.0;
      case WindStrength.FreshBreeze: 
      case WindStrength.StrongBreeze: return 1.5;
      case WindStrength.NearGale: 
      case WindStrength.Gale: return 2.0;
      case WindStrength.StrongGale: 
      case WindStrength.Storm: return 2.5;
      case WindStrength.ViolentStorm: 
      case WindStrength.Hurricane: return 3.0;
      default: return 1.0;
    }
  };
  
  // Update wind indicator on each frame
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const windVector = windDirectionToVector(direction);
    const intensityFactor = getWindIntensityFactor(strength);
    
    // Only update a subset of particles each frame for better performance
    const particlesToUpdate = Math.ceil(count * delta * 10);
    const startOffset = updateRef.current % count;
    
    for (let i = 0; i < particlesToUpdate; i++) {
      const index = (startOffset + i) % count;
      const posIndex = index * 3;
      
      // Update position based on wind direction and speed
      positions[posIndex] += windVector.x * delta * intensityFactor * speedKnots * 0.01;
      positions[posIndex + 2] += windVector.z * delta * intensityFactor * speedKnots * 0.01;
      
      // Add some vertical drift
      positions[posIndex + 1] += (Math.random() - 0.4) * delta * 0.2;
      
      // If particle goes out of bounds, reset it on the upwind edge
      if (
        positions[posIndex] > area / 2 || 
        positions[posIndex] < -area / 2 || 
        positions[posIndex + 2] > area / 2 || 
        positions[posIndex + 2] < -area / 2 ||
        positions[posIndex + 1] > height ||
        positions[posIndex + 1] < 0
      ) {
        // Place the particle on the upwind edge
        if (Math.abs(windVector.x) > Math.abs(windVector.z)) {
          // Wind is mostly East-West
          positions[posIndex] = windVector.x > 0 ? -area / 2 : area / 2;
          positions[posIndex + 2] = (Math.random() - 0.5) * area;
        } else {
          // Wind is mostly North-South
          positions[posIndex] = (Math.random() - 0.5) * area;
          positions[posIndex + 2] = windVector.z > 0 ? -area / 2 : area / 2;
        }
        
        positions[posIndex + 1] = Math.random() * height;
      }
    }
    
    updateRef.current += particlesToUpdate;
    particles.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry {...particles.geometry} />
      <pointsMaterial 
        size={size} 
        color={new THREE.Color('#ffffff')} 
        transparent 
        opacity={0.3}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default WindEffect; 