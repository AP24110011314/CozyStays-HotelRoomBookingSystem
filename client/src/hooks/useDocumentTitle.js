import { useEffect } from 'react';
import { HOTEL_CONFIG } from '../config/hotel';

export function useDocumentTitle(title) {
  useEffect(() => {
    const appName = HOTEL_CONFIG.name || 'CozyStays';
    if (title) {
      if (title.endsWith(appName)) {
        document.title = title;
      } else {
        document.title = `${title} | ${appName}`;
      }
    } else {
      document.title = appName;
    }
  }, [title]);
}

export default useDocumentTitle;
