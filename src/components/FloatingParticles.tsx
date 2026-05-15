import { useEffect, useRef } from 'react';

const COLORS = ['#ff2233', '#ff6600', '#ffaa00', '#ff4411', '#ffdd55', '#ff8800'];

export function FloatingParticles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 2;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px;
        height:${size}px;
        background:${color};
        box-shadow:0 0 5px ${color};
        animation-duration:${Math.random() * 14 + 9}s;
        animation-delay:${Math.random() * 12}s;
      `;
      el.appendChild(p);
    }

    return () => { el.innerHTML = ''; };
  }, []);

  return <div ref={ref} className="particles" />;
}
