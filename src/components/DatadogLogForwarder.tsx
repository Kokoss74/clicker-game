import { useEffect } from 'react';
import { datadogLogs } from '@datadog/browser-logs';

interface DatadogLogForwarderProps { 
  children?: React.ReactNode;
}

const DatadogLogForwarder: React.FC<DatadogLogForwarderProps> = ({ children }) => { 
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    // Override console methods to send logs to Datadog
    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      datadogLogs.logger.debug(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '), { consoleMethod: 'log' });
    };
    
    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      datadogLogs.logger.info(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '), { consoleMethod: 'info' });
    };
    
    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      datadogLogs.logger.warn(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '), { consoleMethod: 'warn' });
    };
    
    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      datadogLogs.logger.error(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '), { consoleMethod: 'error' });
    };
    
    console.debug = function(...args) {
      originalConsole.debug.apply(console, args);
      datadogLogs.logger.debug(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '), { consoleMethod: 'debug' });
    };
    
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, []); 

  return <>{children}</>;
};

export default DatadogLogForwarder; 