export const CONFIG = {
  mqtt: {
      protocol: 'wss',
      host: '09872002dac9410e9af391b1a7066483.s1.eu.hivemq.cloud',
      port: 8884,
      path: '/mqtt',
      username: 'naimur',
      password: null, // SECURITY: Password is now supplied by the driver logic
      clientId: (() => {
          let id = localStorage.getItem('mqtt_client_id');
          if (!id) {
              id = 'uiu-' + Math.random().toString(16).substr(2, 8);
              localStorage.setItem('mqtt_client_id', id);
          }
          return id;
      })()
  },
  topics: {
      location: 'uiu/bus/location',
      presence: 'uiu/presence'
  },
  uiuCoords: [23.79790, 90.44970],
  presenceInterval: 15000,
  minAccuracy: 50
};

export const BUS_STYLES = {
  'K': 'bg-blue-500',
  'N': 'bg-green-500',
  'A': 'bg-purple-500',
  'default': 'bg-orange-500',
  'to_uiu': 'bg-green-600',
  'from_uiu': 'bg-red-600'
};
