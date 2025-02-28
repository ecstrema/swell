export const useMousePosition = () => {
  let x = $state<number>(0);
  let y = $state<number>(0);

  const updateMousePosition = (event: MouseEvent) => {
    x = event.clientX;
    y = event.clientY;
  };

  $effect(() => {
    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  });

  return {
    get x() {
      return x;
    },
    get y() {
      return y;
    },
  };
};
