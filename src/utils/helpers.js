export const isMobile = () => window.innerWidth <= 768;

export const updateMousePosition = (event, rect) => {
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  };
};

export const updateTouchPosition = (touch, rect) => {
  return {
    x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((touch.clientY - rect.top) / rect.height) * 2 + 1
  };
};

export const getTouchDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const highlightObject = (obj, highlight) => {
  if (obj) {
    obj.traverse((child) => {
      if (child.isMesh) {
        if (highlight) {
          child.material = child.material.clone();
          child.material.emissive.setHex(0x444444);
        } else {
          child.material.emissive.setHex(0x000000);
        }
      }
    });
  }
};
