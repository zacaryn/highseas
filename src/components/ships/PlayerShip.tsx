import React, { useState } from 'react';
import Ship from './Ship';
import { ShipClass, ShipDamage } from '../../models/ShipTypes';

interface PlayerShipProps {
  shipClass: ShipClass;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const PlayerShip: React.FC<PlayerShipProps> = ({
  shipClass = ShipClass.Sloop,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) => {
  const [damage, setDamage] = useState<ShipDamage>({
    hullIntegrity: 1,
    sailIntegrity: 1,
    mastIntegrity: 1,
    rudderIntegrity: 1
  });
  
  // Function to update damage, to be passed to damage control UI
  const handleDamageUpdate = (type: string, value: number) => {
    setDamage(prev => {
      switch(type) {
        case 'hull':
          return { ...prev, hullIntegrity: value };
        case 'sail':
          return { ...prev, sailIntegrity: value };
        case 'mast':
          return { ...prev, mastIntegrity: value };
        case 'rudder':
          return { ...prev, rudderIntegrity: value };
        default:
          return prev;
      }
    });
  };

  return (
    <Ship
      shipClass={shipClass}
      position={position}
      rotation={rotation}
      damage={damage}
    />
  );
};

export default PlayerShip; 