import '@testing-library/jest-dom/vitest'

// jsdom no ejecuta animation frames: en tests los marcadores se pintan al
// instante para que las aserciones los encuentren sin avanzar frames.
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
  callback(performance.now());
  return 0;
};
globalThis.cancelAnimationFrame = () => {};
