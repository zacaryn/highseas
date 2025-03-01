import React from 'react';
import { useWindStore } from '../../store/useWindStore';
import { WindStrength } from '../../models/WindModel';
import './WindIndicator.css';

const WindIndicator: React.FC = () => {
  const { direction, strength, speedKnots } = useWindStore();
  
  // Convert wind direction from radians to degrees for display
  // Adjust for compass directions where 0° is North, 90° is East
  const directionDegrees = ((direction * 180 / Math.PI) + 90) % 360;
  
  // Get arrow rotation - arrow points in the direction the wind is coming FROM
  const arrowRotation = `rotate(${directionDegrees}deg)`;
  
  // Get directional name
  const getDirectionName = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };
  
  // Get color based on wind strength
  const getWindColor = (strength: WindStrength): string => {
    switch(strength) {
      case WindStrength.Calm:
      case WindStrength.LightAir:
      case WindStrength.LightBreeze:
        return '#8bc34a'; // Light green for light winds
      
      case WindStrength.GentleBreeze:
      case WindStrength.ModerateBreeze:
      case WindStrength.FreshBreeze:
        return '#2196f3'; // Blue for moderate winds
      
      case WindStrength.StrongBreeze:
      case WindStrength.NearGale:
      case WindStrength.Gale:
        return '#ff9800'; // Orange for strong winds
      
      case WindStrength.StrongGale:
      case WindStrength.Storm:
        return '#f44336'; // Red for storm conditions
      
      case WindStrength.ViolentStorm:
      case WindStrength.Hurricane:
        return '#9c27b0'; // Purple for extreme conditions
      
      default:
        return '#2196f3';
    }
  };
  
  return (
    <div className="wind-indicator">
      <div className="wind-card">
        <div className="wind-compass">
          <div className="compass-ring">
            <div className="compass-marker north">N</div>
            <div className="compass-marker east">E</div>
            <div className="compass-marker south">S</div>
            <div className="compass-marker west">W</div>
          </div>
          
          <div 
            className="wind-arrow" 
            style={{ 
              transform: arrowRotation,
              backgroundColor: getWindColor(strength)
            }}
          />
        </div>
        
        <div className="wind-info">
          <div className="wind-direction">
            Wind: {getDirectionName(directionDegrees)} ({Math.round(directionDegrees)}°)
          </div>
          <div className="wind-strength">
            {strength}: {Math.round(speedKnots)} knots
          </div>
        </div>
      </div>
    </div>
  );
};

export default WindIndicator; 