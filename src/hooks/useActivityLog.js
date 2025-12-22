/**
 * React Hook for logging state changes and component lifecycle
 */
import { useEffect, useRef } from 'react';
import activityLogger from '../lib/activityLogger.js';

/**
 * Hook to log state changes
 * @param {string} componentName - Name of the component
 * @param {object} state - State object to watch
 */
export function useActivityLog(componentName, state = {}) {
  const prevStateRef = useRef({});
  
  useEffect(() => {
    // Log component mount
    activityLogger.info('ComponentMount', `${componentName} mounted`, {
      componentName,
      pathname: window.location.pathname,
    });
    
    return () => {
      // Log component unmount
      activityLogger.info('ComponentUnmount', `${componentName} unmounted`, {
        componentName,
        pathname: window.location.pathname,
      });
    };
  }, [componentName]);
  
  useEffect(() => {
    // Log state changes
    const prevState = prevStateRef.current;
    Object.keys(state).forEach(key => {
      if (prevState[key] !== state[key]) {
        activityLogger.logStateChange(
          componentName,
          key,
          prevState[key],
          state[key]
        );
      }
    });
    prevStateRef.current = { ...state };
  }, [componentName, state]);
}

/**
 * Hook to log button clicks and interactions
 * @param {string} componentName - Name of the component
 * @param {function} handler - Original click handler
 * @param {string} actionName - Name of the action
 */
export function useLoggedClick(componentName, handler, actionName = 'click') {
  return (event) => {
    activityLogger.logClick(event.target, {
      component: componentName,
      action: actionName,
      page: window.location.pathname,
    });
    
    if (handler) {
      return handler(event);
    }
  };
}

export default useActivityLog;
