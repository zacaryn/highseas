// Ship types based on Sid Meier's Pirates
export enum ShipClass {
  Sloop = 'Sloop',
  Frigate = 'Frigate',
  Galleon = 'Galleon',
  WarGalleon = 'WarGalleon',
  PinnaceBrig = 'PinnaceBrig',
  MerchantBrig = 'MerchantBrig',
}

export interface ShipStats {
  class: ShipClass;
  speed: number; // Max speed
  maneuverability: number; // How quickly it can turn (0-10)
  cannons: number; // Number of cannons
  cargoCapacity: number; // How much cargo it can carry
  crewCapacity: number; // Maximum crew size
  health: number; // Ship health/durability
  draft: number; // How deep the ship sits in water (affects buoyancy)
  displacement: number; // Ship's displacement in tons
  length: number; // Ship length in meters
  width: number; // Ship width (beam) in meters
  sailArea: number; // Total sail area in square meters
}

// Damage model for ships
export interface ShipDamage {
  hullIntegrity: number; // 0-1, affects buoyancy and water intake
  sailIntegrity: number; // 0-1, affects speed
  mastIntegrity: number; // 0-1, affects sail effectiveness
  rudderIntegrity: number; // 0-1, affects maneuverability
}

// Default stats for each ship type
export const SHIP_STATS: Record<ShipClass, ShipStats> = {
  [ShipClass.Sloop]: {
    class: ShipClass.Sloop,
    speed: 8,
    maneuverability: 9,
    cannons: 8,
    cargoCapacity: 40,
    crewCapacity: 75,
    health: 400,
    draft: 2.5,
    displacement: 150,
    length: 18,
    width: 5.5,
    sailArea: 180,
  },
  [ShipClass.Frigate]: {
    class: ShipClass.Frigate,
    speed: 6,
    maneuverability: 7,
    cannons: 24,
    cargoCapacity: 80,
    crewCapacity: 200,
    health: 800,
    draft: 4.2,
    displacement: 700,
    length: 45,
    width: 12,
    sailArea: 1200,
  },
  [ShipClass.Galleon]: {
    class: ShipClass.Galleon,
    speed: 4,
    maneuverability: 3,
    cannons: 30,
    cargoCapacity: 160,
    crewCapacity: 300,
    health: 1200,
    draft: 5.8,
    displacement: 1500,
    length: 50,
    width: 16,
    sailArea: 1800,
  },
  [ShipClass.WarGalleon]: {
    class: ShipClass.WarGalleon,
    speed: 5,
    maneuverability: 4,
    cannons: 46,
    cargoCapacity: 120,
    crewCapacity: 350,
    health: 1600,
    draft: 6.0,
    displacement: 1800,
    length: 55,
    width: 18,
    sailArea: 2000,
  },
  [ShipClass.PinnaceBrig]: {
    class: ShipClass.PinnaceBrig,
    speed: 7,
    maneuverability: 8,
    cannons: 16,
    cargoCapacity: 60,
    crewCapacity: 120,
    health: 600,
    draft: 3.2,
    displacement: 280,
    length: 25,
    width: 7,
    sailArea: 400,
  },
  [ShipClass.MerchantBrig]: {
    class: ShipClass.MerchantBrig,
    speed: 5,
    maneuverability: 6,
    cannons: 12,
    cargoCapacity: 100,
    crewCapacity: 100,
    health: 700,
    draft: 3.8,
    displacement: 450,
    length: 32,
    width: 9,
    sailArea: 650,
  },
};

// Create a default damage object (full health)
export const createDefaultShipDamage = (): ShipDamage => ({
  hullIntegrity: 1,
  sailIntegrity: 1,
  mastIntegrity: 1,
  rudderIntegrity: 1,
}); 