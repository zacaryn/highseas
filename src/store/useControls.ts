import { create } from 'zustand';

interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  setKey: (key: string, pressed: boolean) => void;
}

export const useControls = create<ControlState>((set) => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  setKey: (key, pressed) => {
    switch (key) {
      case 'KeyW':
        set({ forward: pressed });
        break;
      case 'KeyS':
        set({ backward: pressed });
        break;
      case 'KeyA':
        set({ left: pressed });
        break;
      case 'KeyD':
        set({ right: pressed });
        break;
    }
  },
}));

// Event listeners for keyboard controls
export const setupKeyboardControls = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    useControls.getState().setKey(event.code, true);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    useControls.getState().setKey(event.code, false);
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}; 