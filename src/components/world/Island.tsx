import React, { useRef, useMemo, useCallback } from 'react';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Add a constant for ISLAND_SCALE to fix the linter error
// This should match the value in GameWorld.tsx
const ISLAND_SCALE = 6.0;

// Simple implementation of Simplex Noise since we don't want to add dependencies
class SimplexNoise {
  private grad3: number[][];
  private p: number[];
  private perm: number[];
  private simplex: number[][];

  constructor(seed = Math.random() * 1000) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    this.p = [];
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(seed + i * 152.3742) % 256;
    }
    this.perm = new Array(512);
    this.simplex = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 0, 0, 0], [0, 2, 3, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 2, 3, 0],
      [0, 2, 1, 3], [0, 0, 0, 0], [0, 3, 1, 2], [0, 3, 2, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 3, 2, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [1, 2, 0, 3], [0, 0, 0, 0], [1, 3, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 3, 0, 1], [2, 3, 1, 0],
      [1, 0, 2, 3], [1, 0, 3, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 3, 1], [0, 0, 0, 0], [2, 1, 3, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [2, 0, 1, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 0, 1, 2], [3, 0, 2, 1], [0, 0, 0, 0], [3, 1, 2, 0],
      [2, 1, 0, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 1, 0, 2], [0, 0, 0, 0], [3, 2, 0, 1], [3, 2, 1, 0]
    ];
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g: number[], x: number, y: number): number {
    if (!g) return 0; // Guard against undefined
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: number, yin: number): number {
    const n0 = 0, n1 = 0, n2 = 0;
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n = 0;
    
    if (t0 >= 0) {
      const gi0 = this.perm[ii + this.perm[jj]] % 12;
      t0 *= t0;
      n += t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    if (t1 >= 0) {
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
      t1 *= t1;
      n += t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    if (t2 >= 0) {
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
      t2 *= t2;
      n += t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70.0 * n;
  }
}

// Let's use a simpler noise implementation as fallback
// This is a basic Perlin noise implementation that's more reliable
function simpleNoise(x: number, y: number): number {
  // Simple grid-based noise
  const xInt = Math.floor(x);
  const yInt = Math.floor(y);
  const xFrac = x - xInt;
  const yFrac = y - yInt;
  
  // Smoothing function
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sx = smooth(xFrac);
  const sy = smooth(yFrac);
  
  // Hash function for pseudo-randomness
  const hash = (x: number, y: number) => {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
  };
  
  // Bilinear interpolation
  const c00 = hash(xInt, yInt);
  const c10 = hash(xInt + 1, yInt);
  const c01 = hash(xInt, yInt + 1);
  const c11 = hash(xInt + 1, yInt + 1);
  
  const nx0 = c00 + sx * (c10 - c00);
  const nx1 = c01 + sx * (c11 - c01);
  
  return nx0 + sy * (nx1 - nx0);
}

// Create a noise generator for consistent noise
const noise = new SimplexNoise(42); // Fixed seed for consistency

interface IslandProps {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  name: string;
  isArchipelago?: boolean;
  isDistantShore?: boolean;
}

const Island: React.FC<IslandProps> = ({ 
  position, 
  size, 
  rotation = [0, 0, 0], 
  name,
  isArchipelago = false,
  isDistantShore = false
}) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Color palette - enhanced for more natural look
  const sandColor = new THREE.Color('#e0c9a6');
  const lightSandColor = new THREE.Color('#f2e2c9');
  const grassColor = new THREE.Color('#567d46');
  const darkGrassColor = new THREE.Color('#3a5a30');
  const lightGrassColor = new THREE.Color('#729965');
  const mountainColor = new THREE.Color('#696969');
  const darkMountainColor = new THREE.Color('#494949');
  const rockyColor = new THREE.Color('#7d7563');
  
  // Helper function to merge buffer attributes
  const mergeBufferAttributes = (attributes: THREE.BufferAttribute[], vertexCount: number) => {
    if (!attributes || attributes.length < 1) return null;
    
    const itemSize = attributes[0].itemSize;
    const array = new Float32Array(vertexCount * itemSize);
    
    let offset = 0;
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const attributeArray = attribute.array;
      
      for (let j = 0; j < attributeArray.length; j++) {
        array[offset++] = attributeArray[j];
      }
    }
    
    return new THREE.Float32BufferAttribute(array, itemSize);
  };
  
  // Create BufferGeometryUtils to merge geometries
  const BufferGeometryUtils = {
    mergeBufferGeometries: (geometries: THREE.BufferGeometry[]) => {
      if (!geometries || geometries.length < 1) return null;
      
      // Use the first geometry as base
      const mergedGeometry = geometries[0].clone();
      
      // Early return if only one geometry
      if (geometries.length === 1) return mergedGeometry;
      
      let vertexCount = mergedGeometry.attributes.position.count;
      const mergedPositions = [...Array.from(mergedGeometry.attributes.position.array)];
      const mergedNormals = mergedGeometry.attributes.normal ? 
                          [...Array.from(mergedGeometry.attributes.normal.array)] : [];
      const mergedColors = mergedGeometry.attributes.color ? 
                         [...Array.from(mergedGeometry.attributes.color.array)] : [];
      
      // Merge all other geometries
      for (let i = 1; i < geometries.length; i++) {
        const geometry = geometries[i];
        const positions = geometry.attributes.position.array;
        
        // Add positions
        for (let j = 0; j < positions.length; j++) {
          mergedPositions.push(positions[j]);
        }
        
        // Add normals if they exist
        if (geometry.attributes.normal && mergedNormals.length > 0) {
          const normals = geometry.attributes.normal.array;
          for (let j = 0; j < normals.length; j++) {
            mergedNormals.push(normals[j]);
          }
        }
        
        // Add colors if they exist
        if (geometry.attributes.color && mergedColors.length > 0) {
          const colors = geometry.attributes.color.array;
          for (let j = 0; j < colors.length; j++) {
            mergedColors.push(colors[j]);
          }
        }
        
        vertexCount += geometry.attributes.position.count;
      }
      
      // Set merged attributes
      mergedGeometry.setAttribute('position', 
        new THREE.Float32BufferAttribute(new Float32Array(mergedPositions), 3));
      
      if (mergedNormals.length > 0) {
        mergedGeometry.setAttribute('normal', 
          new THREE.Float32BufferAttribute(new Float32Array(mergedNormals), 3));
      } else {
        // Compute normals if they don't exist
        mergedGeometry.computeVertexNormals();
      }
      
      if (mergedColors.length > 0) {
        mergedGeometry.setAttribute('color', 
          new THREE.Float32BufferAttribute(new Float32Array(mergedColors), 3));
      }
      
      return mergedGeometry;
    }
  };
  
  // Get noise value at given coordinates with multiple octaves for more detail
  const getNoiseValue = (x: number, y: number, scale = 1) => {
    try {
      // Increased amplitude for more dramatic terrain
      return 0.7 * noise.noise2D(x * 0.5 * scale, y * 0.5 * scale) + 
             0.4 * noise.noise2D(x * scale, y * scale) +
             0.25 * noise.noise2D(x * 2 * scale, y * 2 * scale);
    } catch (e) {
      // Fallback to simpler noise if the noise function fails
      console.warn("Simplex noise failed, using fallback", e);
      return simpleNoise(x * scale, y * scale);
    }
  };
  
  // Create coastline shape using noise
  const generateCoastlineShape = useCallback((segments: number, radius: number, irregularity: number) => {
    const points = [];
    const noiseOffset = Math.random() * 100; // Random offset for varied islands
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noiseScale = 3;
      const noiseValue = getNoiseValue(Math.cos(angle) + noiseOffset, Math.sin(angle) + noiseOffset, noiseScale);
      
      // More irregular coastlines for archipelago
      const radiusNoise = radius * (1 + noiseValue * irregularity);
      const x = Math.cos(angle) * radiusNoise;
      const y = Math.sin(angle) * radiusNoise;
      
      points.push(new THREE.Vector2(x, y));
    }
    
    return new THREE.Shape(points);
  }, []);
  
  // Create functions with useCallback to avoid dependency cycles
  const generateDistantShoreGeometry = useCallback((baseSize: [number, number, number]) => {
    const segments = 48; // More segments for smoother coastline
    const width = baseSize[0];
    const height = baseSize[1] * 0.8; // Increased height
    const depth = baseSize[2];
    
    // Create base geometry with randomized heights
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    const positions = geometry.attributes.position.array;
    
    // Create an array to store vertex colors
    const colors = [];
    const color = new THREE.Color();
    
    // Create gentle rolling hills and occasional mountains
    for (let i = 0; i < positions.length; i += 3) {
      // Calculate position in the grid
      const x = positions[i];
      const z = positions[i + 2];
      
      // Calculate normalized position between 0-1
      const nx = (x / width) + 0.5;
      const nz = (z / depth) + 0.5;
      
      // Use noise for more natural terrain
      const baseNoise = getNoiseValue(nx * 5, nz * 5, 0.5);
      const mountainNoise = Math.pow(Math.abs(getNoiseValue(nx * 10, nz * 10, 3)), 2);
      
      // Apply height with increased base level to ensure visibility
      positions[i + 1] = (baseNoise * 0.8 + mountainNoise * 1.5) * height + 1.0; // Added base height
      
      // Assign colors based on height with noise variation for natural look
      const heightValue = positions[i + 1] / height + 0.5;
      const colorNoise = getNoiseValue(nx * 20, nz * 20, 2) * 0.1;
      
      if (heightValue > 0.8) {
        // Mountain peaks
        color.lerpColors(mountainColor, darkMountainColor, colorNoise + 0.5);
      } else if (heightValue > 0.6) {
        // Rocky areas
        color.lerpColors(mountainColor, rockyColor, colorNoise + 0.5);
      } else if (heightValue > 0.4) {
        // Forest/grass
        color.lerpColors(grassColor, darkGrassColor, colorNoise + 0.5);
      } else if (heightValue > 0.1) {
        // Lower grass
        color.lerpColors(grassColor, lightGrassColor, colorNoise + 0.5);
      } else {
        // Beach
        color.lerpColors(sandColor, lightSandColor, colorNoise + 0.5);
      }
      
      colors.push(color.r, color.g, color.b);
    }
    
    // Add colors to geometry
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Rotate to be horizontal
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, [sandColor, lightSandColor, grassColor, darkGrassColor, lightGrassColor, mountainColor, darkMountainColor, rockyColor]);
  
  // Create detailed island with irregular coastline
  const createDetailedIslandGeometry = useCallback((baseSize: [number, number, number], irregularity = 0.3) => {
    const width = baseSize[0];
    const height = baseSize[1];
    const depth = baseSize[2];
    
    // Create irregular shape using noise
    const radius = Math.min(width, depth) / 2;
    const coastShape = generateCoastlineShape(32, radius, irregularity);
    
    // Extrude shape to create base geometry
    const baseGeometry = new THREE.ExtrudeGeometry(coastShape, {
      depth: 0.5, // More depth to ensure visibility
      bevelEnabled: false
    });
    
    // Create a high-resolution plane for the surface
    const segments = Math.max(32, Math.floor(radius * 3));
    const surfaceGeometry = new THREE.PlaneGeometry(width * 1.1, depth * 1.1, segments, segments);
    const positions = surfaceGeometry.attributes.position.array;
    
    // Create vertex colors array for terrain details
    const colors = [];
    const color = new THREE.Color();
    
    // Add height map and color variation for terrain
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      
      // Distance from center normalized 0-1
      const nx = x / (width * 1.1);
      const nz = z / (depth * 1.1);
      
      // Distance from center (0-1)
      const distFromCenter = Math.sqrt(nx * nx + nz * nz) * 2;
      
      // Create detailed terrain using multiple noise frequencies
      const detailScale = 1.2;
      const terrainNoise = getNoiseValue(nx * 8, nz * 8, detailScale);
      
      // Island edge shape - smoother transition to water
      // Use a steeper falloff curve to make islands more visible
      const edgeFalloff = Math.max(0, 1 - Math.pow(distFromCenter, 1.8));
      
      // Add occasional mountains and hills
      const mountainScaling = isArchipelago ? 0.8 : 1.2;
      const mountainNoise = Math.pow(Math.abs(getNoiseValue(nx * 6, nz * 6, 1.5)), 2) * mountainScaling;
      
      // Combine elevation factors with greater height multiplier to make more visible
      const totalHeight = (terrainNoise * 0.6 + mountainNoise * 1.2) * edgeFalloff;
      
      // Scale height by island height parameter with increased minimum height
      positions[i + 1] = totalHeight * height * 1.5 + 0.5; // Increased height multiplier and base height
      
      // Color based on height and noise for more detail
      // Normalize height to 0-1 range for coloring
      const heightValue = (totalHeight + 0.4) * edgeFalloff;
      const colorVariation = getNoiseValue(nx * 30, nz * 30, 5) * 0.1;
      
      if (heightValue < 0.2) {
        // Beach - sandy color with variation
        color.lerpColors(sandColor, lightSandColor, 0.5 + colorVariation);
      } else if (heightValue < 0.5) {
        // Grass/low vegetation
        color.lerpColors(grassColor, lightGrassColor, 0.5 + colorVariation);
      } else if (heightValue < 0.8) {
        // Darker vegetation or forest
        color.lerpColors(grassColor, darkGrassColor, 0.5 + colorVariation);
      } else {
        // Mountain/rocky tops
        color.lerpColors(rockyColor, mountainColor, 0.5 + colorVariation);
      }
      
      // Add beach transition at the edges
      if (edgeFalloff < 0.2 && edgeFalloff > 0.05) {
        color.lerpColors(color, sandColor, 1 - edgeFalloff * 5);
      }
      
      colors.push(color.r, color.g, color.b);
    }
    
    // Add colors to geometry
    surfaceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Rotate to be horizontal
    surfaceGeometry.rotateX(-Math.PI / 2);
    
    return surfaceGeometry;
  }, [generateCoastlineShape, isArchipelago, sandColor, lightSandColor, grassColor, darkGrassColor, lightGrassColor, mountainColor, rockyColor, darkMountainColor]);
  
  // Function to generate archipelago with multiple small islands with varied coastlines
  const generateArchipelagoGeometry = useCallback((baseSize: [number, number, number]) => {
    const islands = [];
    const count = Math.floor(Math.random() * 4) + 3; // 3-6 islands
    
    // Create a main island
    const mainIslandSize = [
      baseSize[0] * (Math.random() * 0.2 + 0.6),
      baseSize[1] * (Math.random() * 0.2 + 0.8),
      baseSize[2] * (Math.random() * 0.2 + 0.6)
    ];
    
    const mainIsland = createDetailedIslandGeometry(
      mainIslandSize as [number, number, number], 
      0.4 // More irregular coastline
    );
    islands.push(mainIsland);
    
    // Create surrounding smaller islands with varying coastline irregularity
    for (let i = 0; i < count; i++) {
      // Distribute sub-islands within the base size
      const xSpread = baseSize[0] * 0.85;
      const zSpread = baseSize[2] * 0.85;
      
      // Random position within bounds, avoiding center (where main island is)
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.4 + 0.3; // 30-70% of max distance
      const xPos = Math.cos(angle) * distance * xSpread * 0.5;
      const zPos = Math.sin(angle) * distance * zSpread * 0.5;
      
      // Random size based on main island dimensions
      const width = baseSize[0] * (Math.random() * 0.25 + 0.15);
      const height = baseSize[1] * (Math.random() * 0.2 + 0.7);
      const depth = baseSize[2] * (Math.random() * 0.25 + 0.15);
      
      // Create island geometry for this sub-island with high irregularity
      const geometry = createDetailedIslandGeometry(
        [width, height, depth], 
        0.5 + Math.random() * 0.3 // Very irregular coastlines for small islands
      );
      
      // Position and add to islands array
      geometry.translate(xPos, 0, zPos);
      islands.push(geometry);
    }
    
    // Merge all sub-island geometries
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(islands);
    return mergedGeometry;
  }, [createDetailedIslandGeometry]);
  
  // Function to generate a single island with natural shape
  const generateIslandGeometry = useCallback((baseSize: [number, number, number]) => {
    // Higher irregularity for named islands, less for generic ones
    const irregularity = name === 'Island' ? 0.3 : 0.4;
    return createDetailedIslandGeometry(baseSize, irregularity);
  }, [createDetailedIslandGeometry, name]);
  
  // Create island mesh with optimized approach
  const islandGeometry = useMemo(() => {
    // Use lower resolution for distant shores
    const resolution = isDistantShore ? 32 : isArchipelago ? 48 : 64;
    
    // Scale factors for height - more exaggerated for better visibility
    const heightScale = isDistantShore ? 2.5 : 3.5;
    const noiseScale = isDistantShore ? 0.08 : isArchipelago ? 0.15 : 0.12;
    
    // Create a plane geometry as base
    const geometry = new THREE.PlaneGeometry(
      size[0], 
      size[2], 
      resolution, 
      resolution
    );
    
    // Scale UVs for more detailed texturing
    const uvs = geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setXY(i, uvs.getX(i) * 4, uvs.getY(i) * 4);
    }
    
    // Get vertex positions to modify
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const colorsAttribute = new THREE.BufferAttribute(colors, 3);
    
    // Create more coherent landmass shapes
    // Define island type based on name - some islands are more solid/mountainous, others more varied
    const islandType = name === 'Tortuga' || name === 'Port Royal' || name === 'Nassau' ? 'solid' : 
                      name === 'Archipelago' ? 'archipelago' : 'standard';
    
    // We'll use a base height map to create more coherent landmasses
    const baseHeightMap = new Array(resolution + 1).fill(0).map(() => 
      new Array(resolution + 1).fill(0)
    );
    
    // Generate base height values for more continuous landmass
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const nx = i / resolution;
        const ny = j / resolution;
        
        // Transform to -0.5 to 0.5 range (center of island is 0,0)
        const x = (nx - 0.5) * size[0];
        const y = (ny - 0.5) * size[2];
        
        // Distance from center normalized
        const distanceFromCenter = Math.sqrt(x*x + y*y) / Math.max(size[0]/2, size[2]/2);
        
        // Different falloff profiles for different island types
        let falloff;
        if (islandType === 'solid') {
          // More plateau-like for major settlements
          falloff = Math.max(0, 1 - Math.pow(distanceFromCenter, 1.2));
          if (distanceFromCenter < 0.5) {
            falloff = Math.max(falloff, 0.7); // Create flat plateau in center
          }
        } else if (islandType === 'archipelago') {
          // More scattered, varied height for archipelagos
          falloff = Math.max(0, 1 - Math.pow(distanceFromCenter, 1.8));
        } else {
          // Standard islands
          falloff = Math.max(0, 1 - Math.pow(distanceFromCenter, 1.6));
        }
        
        // Generate coherent base height
        let baseHeight = getNoiseValue(x * noiseScale * 0.5, y * noiseScale * 0.5, 0.5);
        
        // Scale by falloff
        baseHeightMap[i][j] = baseHeight * falloff;
      }
    }
    
    // Add randomness to vertices
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Get distance from center of island (normalized 0-1)
      const centerX = 0;
      const centerY = 0;
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) / 
                               Math.max(size[0] / 2, size[2] / 2);
      
      // Create island shape using combination of noise and distance
      // Use steeper falloff at edges for more defined islands
      const falloff = Math.max(0, 1 - Math.pow(distanceFromCenter, 1.6));
      
      // More stable noise generation with error handling
      let noiseValue = getNoiseValue(x, y, noiseScale);
      
      // Map x,y position to baseHeightMap indices
      const mapX = Math.floor(((x / size[0]) + 0.5) * resolution);
      const mapY = Math.floor(((y / size[2]) + 0.5) * resolution);
      
      // Get base height from our coherent height map (with bounds checking)
      const baseMapX = Math.max(0, Math.min(resolution, mapX));
      const baseMapY = Math.max(0, Math.min(resolution, mapY));
      
      // Combine coherent base height with detailed noise
      let baseHeight = baseHeightMap[baseMapX][baseMapY];
      
      // Adjust noise based on island type
      if (islandType === 'solid') {
        // Solid islands have plateaus with detailed features on top
        const detailNoise = noiseValue * 0.3;
        noiseValue = baseHeight * 1.2 + detailNoise;
      } else if (islandType === 'archipelago') {
        // Archipelagos have more varied, scattered terrain
        noiseValue = baseHeight * 0.7 + noiseValue * 0.6;
      } else {
        // Standard islands blend base and detail
        noiseValue = baseHeight * 0.8 + noiseValue * 0.5;
      }
      
      // Calculate height, amplifying the extremes for better visibility
      let height = size[1] * heightScale * noiseValue * Math.pow(falloff, 1.6);
      
      // Ensure minimum height for small islands like Tortuga to ensure visibility
      const minHeight = name === 'Tortuga' || size[0] < 2 * ISLAND_SCALE ? size[1] * 0.8 : 0;
      height = Math.max(height, minHeight * falloff);
      
      // Skip terrain height for very distant shores - use constant height instead
      if (isDistantShore && distanceFromCenter > 0.7) {
        height = size[1] * 0.8 * falloff;
      }
      
      // Set the new height (y-coordinate in our case since we're using PlaneGeometry)
      positions.setZ(i, height);
      
      // Vertex coloring based on height and distance for better visual detail
      let color;
      if (height < 0.1) {
        // Beach/sand color
        color = sandColor.clone().lerp(lightSandColor, Math.random() * 0.3);
      } else if (height < size[1] * 0.5) {
        // Grass color - varies with height
        const grassBlend = Math.min(1, height / (size[1] * 0.4));
        color = lightGrassColor.clone().lerp(darkGrassColor, grassBlend * 0.8 + Math.random() * 0.2);
      } else {
        // Mountain/rock color
        const rockBlend = Math.min(1, (height - size[1] * 0.5) / (size[1] * 0.5));
        color = rockyColor.clone().lerp(darkMountainColor, rockBlend * 0.7 + Math.random() * 0.3);
      }
      
      colorsAttribute.setXYZ(i, color.r, color.g, color.b);
    }
    
    // Add the colors attribute
    geometry.setAttribute('color', colorsAttribute);
    
    // Update normals after changing vertices
    geometry.computeVertexNormals();
    
    // Rotate the geometry to make it horizontal (rotated around X-axis)
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, [size, isArchipelago, isDistantShore]);
  
  return (
    <group ref={meshRef} position={[position[0], position[1] - 0.5, position[2]]} rotation={rotation}>
      {/* Render island based on generated geometry */}
      {islandGeometry && (
        <mesh receiveShadow castShadow geometry={islandGeometry}>
          <meshStandardMaterial 
            vertexColors 
            side={THREE.DoubleSide} 
            flatShading={!isDistantShore}
          />
        </mesh>
      )}
      
      {/* Island name floating above - only show for non-distant shores or if explicitly named */}
      {(!isDistantShore || name !== 'DistantShore') && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            position={[0, 5, 0]}
            color="#FF3333"
            fontSize={3.5}
            maxWidth={50}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.2}
            outlineColor="#000000"
          >
            {name}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

export default Island; 