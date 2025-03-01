import * as THREE from 'three';

// Wind direction in radians (0 is East, Math.PI/2 is North, Math.PI is West, 3*Math.PI/2 is South)
export enum WindStrength {
  Calm = 'Calm',         // 0-3 knots
  LightAir = 'LightAir', // 4-6 knots
  LightBreeze = 'LightBreeze', // 7-10 knots
  GentleBreeze = 'GentleBreeze', // 11-16 knots
  ModerateBreeze = 'ModerateBreeze', // 17-21 knots
  FreshBreeze = 'FreshBreeze', // 22-27 knots
  StrongBreeze = 'StrongBreeze', // 28-33 knots
  NearGale = 'NearGale', // 34-40 knots
  Gale = 'Gale',         // 41-47 knots
  StrongGale = 'StrongGale', // 48-55 knots
  Storm = 'Storm',       // 56-63 knots
  ViolentStorm = 'ViolentStorm', // 64-72 knots
  Hurricane = 'Hurricane', // 73+ knots
}

export interface WindState {
  direction: number; // In radians
  strength: WindStrength;
  speedKnots: number; // Actual wind speed in knots
  fluctuation: number; // How much the wind fluctuates (0-1)
}

// Get the numerical factor for wind based on strength (0-1)
export const getWindFactor = (strength: WindStrength): number => {
  switch(strength) {
    case WindStrength.Calm: return 0.05;
    case WindStrength.LightAir: return 0.1;
    case WindStrength.LightBreeze: return 0.2;
    case WindStrength.GentleBreeze: return 0.3;
    case WindStrength.ModerateBreeze: return 0.4;
    case WindStrength.FreshBreeze: return 0.5;
    case WindStrength.StrongBreeze: return 0.6;
    case WindStrength.NearGale: return 0.7;
    case WindStrength.Gale: return 0.8;
    case WindStrength.StrongGale: return 0.85;
    case WindStrength.Storm: return 0.9;
    case WindStrength.ViolentStorm: return 0.95;
    case WindStrength.Hurricane: return 1.0;
    default: return 0.3;
  }
};

// Get the wind speed in knots based on strength
export const getWindSpeed = (strength: WindStrength): number => {
  switch(strength) {
    case WindStrength.Calm: return 2;
    case WindStrength.LightAir: return 5;
    case WindStrength.LightBreeze: return 9;
    case WindStrength.GentleBreeze: return 14;
    case WindStrength.ModerateBreeze: return 19;
    case WindStrength.FreshBreeze: return 25;
    case WindStrength.StrongBreeze: return 31;
    case WindStrength.NearGale: return 37;
    case WindStrength.Gale: return 44;
    case WindStrength.StrongGale: return 52;
    case WindStrength.Storm: return 60;
    case WindStrength.ViolentStorm: return 68;
    case WindStrength.Hurricane: return 75;
    default: return 15;
  }
};

// Convert wind direction to a THREE.Vector3
export const windDirectionToVector = (direction: number): THREE.Vector3 => {
  // Convert direction in radians to a unit vector
  // In Three.js, the X-Z plane is the ground plane, Y is up
  return new THREE.Vector3(
    Math.cos(direction), 
    0, 
    Math.sin(direction)
  ).normalize();
};

// Calculate the angle between ship heading and wind direction (in radians)
export const getAngleBetweenWindAndShip = (shipHeading: number, windDirection: number): number => {
  // Normalize angles to 0-2π range
  const normShipHeading = shipHeading % (2 * Math.PI);
  const normWindDirection = windDirection % (2 * Math.PI);
  
  // Calculate the absolute angle difference
  let angleDiff = Math.abs(normShipHeading - normWindDirection);
  
  // Take the smaller angle (0 to π)
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  
  return angleDiff;
};

// Get wind effect multiplier based on point of sail
export const getPointOfSailMultiplier = (angleBetweenWindAndShip: number): number => {
  // Convert angle to degrees for easier understanding
  const angleDegrees = angleBetweenWindAndShip * (180 / Math.PI);
  
  // Points of sail (approximate angles)
  // In Irons (directly into the wind): 0-30 degrees - very slow or no movement
  if (angleDegrees <= 30) {
    return 0.1; // Almost no forward movement
  }
  // Close Hauled: 30-60 degrees - slow but can make progress
  else if (angleDegrees <= 60) {
    return 0.5;
  }
  // Close Reach: 60-90 degrees - good speed
  else if (angleDegrees <= 90) {
    return 0.7;
  }
  // Beam Reach: 90 degrees - excellent speed
  else if (angleDegrees <= 120) {
    return 1.0; // Optimal point of sail
  }
  // Broad Reach: 120-150 degrees - good speed
  else if (angleDegrees <= 150) {
    return 0.9;
  }
  // Running: 150-180 degrees - moderate speed
  else {
    return 0.6;
  }
}; 