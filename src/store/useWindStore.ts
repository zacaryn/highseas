import { create } from 'zustand';
import * as THREE from 'three';
import { WindState, WindStrength, getWindSpeed } from '../models/WindModel';

interface WindStore extends WindState {
  // Actions
  setDirection: (direction: number) => void;
  setStrength: (strength: WindStrength) => void;
  setFluctuation: (fluctuation: number) => void;
  updateWind: (delta: number) => void;
  randomizeWind: () => void;
}

// Random helpers
const randomInRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

const getRandomWindStrength = (): WindStrength => {
  const rand = Math.random();
  
  // Normal distribution favoring moderate winds
  if (rand < 0.05) return WindStrength.Calm;
  if (rand < 0.15) return WindStrength.LightAir;
  if (rand < 0.3) return WindStrength.LightBreeze;
  if (rand < 0.5) return WindStrength.GentleBreeze;
  if (rand < 0.7) return WindStrength.ModerateBreeze;
  if (rand < 0.85) return WindStrength.FreshBreeze;
  if (rand < 0.92) return WindStrength.StrongBreeze;
  if (rand < 0.96) return WindStrength.NearGale;
  if (rand < 0.98) return WindStrength.Gale;
  if (rand < 0.99) return WindStrength.StrongGale;
  if (rand < 0.995) return WindStrength.Storm;
  if (rand < 0.998) return WindStrength.ViolentStorm;
  return WindStrength.Hurricane;
};

// Starting with a moderate breeze from the East
const initialState: WindState = {
  direction: 0, // East
  strength: WindStrength.ModerateBreeze,
  speedKnots: getWindSpeed(WindStrength.ModerateBreeze),
  fluctuation: 0.2, // Moderate wind changes
};

export const useWindStore = create<WindStore>((set, get) => ({
  ...initialState,
  
  setDirection: (direction: number) => {
    set({ direction });
  },
  
  setStrength: (strength: WindStrength) => {
    set({ 
      strength,
      speedKnots: getWindSpeed(strength)
    });
  },
  
  setFluctuation: (fluctuation: number) => {
    set({ fluctuation });
  },
  
  updateWind: (delta: number) => {
    const state = get();
    
    // Only update wind based on fluctuation value and time
    if (Math.random() < state.fluctuation * delta * 0.5) {
      // Gradually shift wind direction
      const directionChange = randomInRange(-0.05, 0.05) * state.fluctuation;
      const newDirection = (state.direction + directionChange) % (Math.PI * 2);
      
      // Occasionally change wind strength (less frequently)
      let newStrength = state.strength;
      if (Math.random() < 0.01) {
        // Wind typically changes gradually
        const strengths = Object.values(WindStrength);
        const currentIndex = strengths.indexOf(state.strength);
        
        // 70% chance to stay within 1 step of current strength
        const rand = Math.random();
        if (rand < 0.35 && currentIndex > 0) {
          // Decrease strength
          newStrength = strengths[currentIndex - 1] as WindStrength;
        } else if (rand < 0.7 && currentIndex < strengths.length - 1) {
          // Increase strength
          newStrength = strengths[currentIndex + 1] as WindStrength;
        } else {
          // Larger change (less common)
          newStrength = getRandomWindStrength();
        }
      }
      
      set({ 
        direction: newDirection,
        strength: newStrength,
        speedKnots: getWindSpeed(newStrength)
      });
    }
  },
  
  randomizeWind: () => {
    // Completely random wind direction and reasonable strength
    set({
      direction: Math.random() * Math.PI * 2,
      strength: getRandomWindStrength(),
      speedKnots: getWindSpeed(getRandomWindStrength()),
      fluctuation: randomInRange(0.1, 0.4)
    });
  }
})); 