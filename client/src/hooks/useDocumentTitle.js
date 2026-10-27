import { useEffect } from 'react';

const PROJECT_NAME = 'Hotel Booking System';

export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${PROJECT_NAME}`;
    } else {
      document.title = PROJECT_NAME;
    }
  }, [title]);
}

export default useDocumentTitle;
