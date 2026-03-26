'use client';

import { useEffect } from 'react';

export function StageWiseInit() {
  useEffect(() => {
    // Инициализируем только в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      import('@stagewise/toolbar').then(({ initToolbar }) => {
        const stagewiseConfig = {
          plugins: [],
        };
        initToolbar(stagewiseConfig);
      });
    }
  }, []);

  // Компонент не рендерит ничего в DOM
  return null;
}
