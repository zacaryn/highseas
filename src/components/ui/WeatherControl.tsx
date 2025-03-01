import React, { useState } from 'react';
import './WeatherControl.css';
import { WindStrength } from '../../models/WindModel';

interface WeatherControlProps {
  onWeatherChange: (isStorm: boolean, windStrength: WindStrength) => void;
}

const WeatherControl: React.FC<WeatherControlProps> = ({ onWeatherChange }) => {
  const [isStorm, setIsStorm] = useState<boolean>(false);
  
  const handleWeatherToggle = () => {
    const newStormState = !isStorm;
    setIsStorm(newStormState);
    
    // Set appropriate wind strength based on weather
    const windStrength = newStormState ? 
      WindStrength.Storm : 
      WindStrength.ModerateBreeze;
    
    onWeatherChange(newStormState, windStrength);
  };
  
  return (
    <div className="weather-control">
      <h3>Weather Conditions</h3>
      
      <button 
        className={`weather-button ${isStorm ? 'storm' : 'normal'}`}
        onClick={handleWeatherToggle}
      >
        {isStorm ? 'Storm Conditions' : 'Normal Weather'}
      </button>
      
      <div className="weather-description">
        {isStorm ? (
          <p>High winds and large waves make navigation difficult</p>
        ) : (
          <p>Moderate breeze, good sailing conditions</p>
        )}
      </div>
    </div>
  );
};

export default WeatherControl; 