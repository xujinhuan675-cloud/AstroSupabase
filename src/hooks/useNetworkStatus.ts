/**
 * useNetworkStatus - 网络状态检测 Hook
 * 用于根据网络状况调整应用行为
 */
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  /** 是否在线 */
  online: boolean;
  /** 网络类型 (4g, 3g, 2g, slow-2g, wifi, ethernet, unknown) */
  effectiveType: string;
  /** 是否为慢速网络 */
  isSlowNetwork: boolean;
  /** 是否启用数据节省模式 */
  saveData: boolean;
  /** 下行速度 (Mbps) */
  downlink: number;
  /** 往返时间 (ms) */
  rtt: number;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  saveData: boolean;
  downlink: number;
  rtt: number;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

const getConnection = (): NetworkInformation | undefined => {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const getNetworkStatus = (): NetworkStatus => {
  if (typeof navigator === 'undefined') {
    return {
      online: true,
      effectiveType: 'unknown',
      isSlowNetwork: false,
      saveData: false,
      downlink: 10,
      rtt: 50,
    };
  }

  const connection = getConnection();
  const effectiveType = connection?.effectiveType || 'unknown';
  const saveData = connection?.saveData || false;
  const downlink = connection?.downlink || 10;
  const rtt = connection?.rtt || 50;

  // 判断是否为慢速网络
  const isSlowNetwork = 
    effectiveType === '2g' || 
    effectiveType === 'slow-2g' ||
    saveData ||
    downlink < 1 ||
    rtt > 500;

  return {
    online: navigator.onLine,
    effectiveType,
    isSlowNetwork,
    saveData,
    downlink,
    rtt,
  };
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(getNetworkStatus);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getNetworkStatus());
    };

    // 监听在线/离线状态
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // 监听网络状态变化
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

/**
 * 根据网络状态获取推荐的图谱配置
 */
export function getGraphConfigForNetwork(isSlowNetwork: boolean) {
  if (isSlowNetwork) {
    return {
      depth: 1, // 减少深度
      showTags: false, // 隐藏标签
      fontSize: 0.9, // 增大字体便于阅读
      repelForce: 2.0, // 增加排斥力减少重叠
      linkDistance: 70, // 增加链接距离
    };
  }
  return {};
}
