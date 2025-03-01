import React from 'react';
import { ShipClass } from '../../models/ShipTypes';
import './ShipSelector.css';

interface ShipSelectorProps {
  onShipSelect: (shipClass: ShipClass) => void;
  currentShip: ShipClass;
}

const ShipSelector: React.FC<ShipSelectorProps> = ({ onShipSelect, currentShip }) => {
  // Ship data for UI
  const shipData = [
    { 
      type: ShipClass.Sloop, 
      name: 'Sloop', 
      description: 'Fast and maneuverable with light armament. Perfect for scouting and hit-and-run tactics.'
    },
    { 
      type: ShipClass.Frigate, 
      name: 'Frigate', 
      description: 'Well-balanced warship with good speed, firepower, and maneuverability.' 
    },
    { 
      type: ShipClass.Galleon, 
      name: 'Galleon', 
      description: 'Large cargo vessel with significant carrying capacity but slower movement.' 
    },
    { 
      type: ShipClass.WarGalleon, 
      name: 'War Galleon', 
      description: 'Heavily armed galleon trading cargo space for additional cannons and crew.' 
    },
    { 
      type: ShipClass.PinnaceBrig, 
      name: 'Pinnace', 
      description: 'Light and fast two-masted vessel ideal for quick raids and reconnaissance.' 
    },
    { 
      type: ShipClass.MerchantBrig, 
      name: 'Merchant Brig', 
      description: 'Two-masted trading vessel with good cargo capacity and reasonable speed.' 
    }
  ];
  
  return (
    <div className="ship-selector">
      <h3>Ship Selection</h3>
      
      <div className="ship-list">
        {shipData.map(ship => (
          <div 
            key={ship.type}
            className={`ship-option ${currentShip === ship.type ? 'selected' : ''}`}
            onClick={() => onShipSelect(ship.type)}
          >
            <div className="ship-name">{ship.name}</div>
            <div className="ship-description">{ship.description}</div>
          </div>
        ))}
      </div>
      
      <div className="current-ship">
        <span>Current Ship:</span>
        <span className="ship-type">{shipData.find(s => s.type === currentShip)?.name}</span>
      </div>
    </div>
  );
};

export default ShipSelector; 