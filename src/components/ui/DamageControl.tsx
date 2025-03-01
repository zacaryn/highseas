import React, { useState } from 'react';
import './DamageControl.css';

interface DamageControlProps {
  onUpdateDamage: (type: string, value: number) => void;
}

const DamageControl: React.FC<DamageControlProps> = ({ onUpdateDamage }) => {
  const [hullIntegrity, setHullIntegrity] = useState<number>(1);
  const [sailIntegrity, setSailIntegrity] = useState<number>(1);
  const [mastIntegrity, setMastIntegrity] = useState<number>(1);
  const [rudderIntegrity, setRudderIntegrity] = useState<number>(1);
  
  const handleHullChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setHullIntegrity(value);
    onUpdateDamage('hull', value);
  };
  
  const handleSailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSailIntegrity(value);
    onUpdateDamage('sail', value);
  };
  
  const handleMastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMastIntegrity(value);
    onUpdateDamage('mast', value);
  };
  
  const handleRudderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setRudderIntegrity(value);
    onUpdateDamage('rudder', value);
  };
  
  const getStatusColor = (value: number) => {
    if (value > 0.7) return '#4CAF50'; // Green
    if (value > 0.4) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };
  
  const getStatusText = (value: number) => {
    if (value > 0.8) return 'Good';
    if (value > 0.6) return 'Minor Damage';
    if (value > 0.4) return 'Damaged';
    if (value > 0.2) return 'Critical';
    return 'Destroyed';
  };
  
  return (
    <div className="damage-control">
      <h3>Damage Control</h3>
      
      <div className="damage-section">
        <div className="damage-label">
          <span>Hull</span>
          <span 
            className="damage-status"
            style={{ color: getStatusColor(hullIntegrity) }}
          >
            {getStatusText(hullIntegrity)}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={hullIntegrity} 
          onChange={handleHullChange}
          className="damage-slider"
        />
        <div className="damage-value">{Math.round(hullIntegrity * 100)}%</div>
      </div>
      
      <div className="damage-section">
        <div className="damage-label">
          <span>Sails</span>
          <span 
            className="damage-status"
            style={{ color: getStatusColor(sailIntegrity) }}
          >
            {getStatusText(sailIntegrity)}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={sailIntegrity} 
          onChange={handleSailChange}
          className="damage-slider"
        />
        <div className="damage-value">{Math.round(sailIntegrity * 100)}%</div>
      </div>
      
      <div className="damage-section">
        <div className="damage-label">
          <span>Mast</span>
          <span 
            className="damage-status"
            style={{ color: getStatusColor(mastIntegrity) }}
          >
            {getStatusText(mastIntegrity)}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={mastIntegrity} 
          onChange={handleMastChange}
          className="damage-slider"
        />
        <div className="damage-value">{Math.round(mastIntegrity * 100)}%</div>
      </div>
      
      <div className="damage-section">
        <div className="damage-label">
          <span>Rudder</span>
          <span 
            className="damage-status"
            style={{ color: getStatusColor(rudderIntegrity) }}
          >
            {getStatusText(rudderIntegrity)}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={rudderIntegrity} 
          onChange={handleRudderChange}
          className="damage-slider"
        />
        <div className="damage-value">{Math.round(rudderIntegrity * 100)}%</div>
      </div>
    </div>
  );
};

export default DamageControl; 