// Types for Water from three examples
import { Material } from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

declare module 'three/examples/jsm/objects/Water.js' {
  export class Water {
    material: {
      uniforms: {
        [key: string]: {
          value: any;
        };
      };
    };
  }
}

// Extending JSX Elements for r3f
declare global {
  namespace JSX {
    interface IntrinsicElements {
      water: any;
    }
  }
} 